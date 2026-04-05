// src/logger/logger.core.module.ts
import { Global, Module, Provider } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { prettyHttpConsole } from './http.format';

export const BASE_LOGGER = Symbol('BASE_LOGGER');

const isProd = process.env.NODE_ENV === 'production';

// filter theo context
const onlyContext = (ctx: string) =>
  winston.format((info) => (info.context === ctx ? info : false))();

// Format cho base logger (non-HTTP logs)
const baseConsoleFormat = winston.format.printf(
  ({ level, message, timestamp, context, ...rest }) => {
    const app = process.env.APP_NAME ?? 'MyApp';
    const meta = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
    const ctx = context ? `[${context}]` : '';
    return `[${app}] ${process.pid} ${timestamp} ${level.toUpperCase()}${ctx} ${message}${meta}`;
  },
);

// Format cho HTTP logger
const httpConsoleFormat = winston.format.combine(
  winston.format.ms(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  prettyHttpConsole,
);

// Create console transports with context filtering
const baseConsoleTransport = new winston.transports.Console({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  format: winston.format.combine(
    // Only log non-HTTP contexts
    winston.format((info) => (info.context !== 'HTTP' ? info : false))(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: !isProd }),
    baseConsoleFormat,
  ),
});

const httpConsoleTransport = new winston.transports.Console({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  format: winston.format.combine(
    // Only log HTTP context
    onlyContext('HTTP'),
    httpConsoleFormat,
  ),
});

function createBaseLogger(): winston.Logger {
  const httpFileRotate = new (winston.transports as any).DailyRotateFile({
    level: 'info',
    dirname: 'logs',
    filename: 'http-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
      onlyContext('HTTP'),
      winston.format.timestamp(),
      winston.format.ms(),
      winston.format.json(),
    ),
  });

  const errorFileRotate = new (winston.transports as any).DailyRotateFile({
    level: 'error',
    dirname: 'logs',
    filename: 'error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
  });

  const combinedFileRotate = new (winston.transports as any).DailyRotateFile({
    level: process.env.FILE_LOG_LEVEL || 'info',
    dirname: 'logs',
    filename: 'combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.ms(),
      winston.format.json(),
    ),
  });

  return winston.createLogger({
    levels: winston.config.npm.levels,
    transports: [
      baseConsoleTransport, // Base logs (non-HTTP)
      httpConsoleTransport, // HTTP logs
      errorFileRotate, // All errors
      combinedFileRotate, // All combined logs
      httpFileRotate, // HTTP specific file logs
    ],
    exitOnError: false,
  });
}

const baseLoggerProvider: Provider = {
  provide: BASE_LOGGER,
  useFactory: () => createBaseLogger(),
};

@Global()
@Module({
  providers: [baseLoggerProvider],
  exports: [baseLoggerProvider],
})
export class LoggerCoreModule {}
