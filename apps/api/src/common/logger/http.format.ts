import chalk from 'chalk';
import winston from 'winston';
import { RequestMeta } from '@/common/types/request.type';

export const prettyHttpConsole = winston.format.printf(
  ({ level, message, timestamp, context, ...requestMeta }: any) => {
    if (context !== 'HTTP') {
      return {
        level,
        message,
        context,
        timestamp,
        ...requestMeta,
      };
    }
    const meta: RequestMeta | undefined = requestMeta;
    // colorize with level
    const colorizeLevel =
      level === 'error'
        ? chalk.red.bold(level.toUpperCase())
        : level === 'warn'
          ? chalk.yellow.bold(level.toUpperCase())
          : chalk.green(level.toUpperCase());

    if (!meta) {
      // fallback when log has no requestMeta
      return `${chalk.gray(timestamp)} ${colorizeLevel} ${message}`;
    }

    // colorize method, status, duration
    const method = chalk.cyan.bold(meta.method);
    const status =
      meta.statusCode >= 500
        ? chalk.bgRed.white(` ${meta.statusCode} `)
        : meta.statusCode >= 400
          ? chalk.red.bold(meta.statusCode)
          : chalk.green(meta.statusCode);
    const duration = chalk.magenta(meta.durationMs);

    // console.log('meta', {
    //     body: meta.body,
    //     headers: meta.headers,
    //     query: meta.query,
    //     params: meta.params,
    // });

    return [
      `[${context}]`,
      chalk.gray(timestamp),
      colorizeLevel,
      method,
      meta.url,
      status,
      duration,
      chalk.white(`\n- req_id: ${chalk.cyan(meta.requestId)}`),
      message && chalk.white(`\n- ${message}`),
      meta.body && chalk.white(`\n- body: ${chalk.cyan(meta.body)}`),
      meta.headers && chalk.white(`\n- headers: ${chalk.cyan(meta.headers)}`),
      meta.query && chalk.white(`\n- query: ${chalk.cyan(meta.query)}`),
      meta.params && chalk.white(`\n- params: ${chalk.cyan(meta.params)}`),
    ]
      .filter(Boolean)
      .join(' ');
  },
);
