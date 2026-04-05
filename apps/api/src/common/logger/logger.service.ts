// src/logger/context-logger.ts
import { Injectable } from '@nestjs/common';
import type { Logger as WinstonLogger } from 'winston';

export type Meta = Record<string, unknown>;

@Injectable()
export class LoggerService {
  constructor(
    private readonly base: WinstonLogger,
    private readonly context: string,
  ) {}

  info(message: string, meta?: Meta) {
    this.base.info(message, { context: this.context, ...(meta ?? {}) });
  }

  warn(message: string, meta?: Meta) {
    this.base.warn(message, { context: this.context, ...(meta ?? {}) });
  }

  debug(message: string, meta?: Meta) {
    this.base.debug(message, { context: this.context, ...(meta ?? {}) });
  }

  verbose(message: string, meta?: Meta) {
    this.base.verbose(message, { context: this.context, ...(meta ?? {}) });
  }

  error(messageOrErr: string | Error, meta?: Meta) {
    if (messageOrErr instanceof Error) {
      const { message, stack, name } = messageOrErr;
      this.base.error(message, {
        context: this.context,
        name,
        stack,
        ...(meta ?? {}),
      });
    } else {
      this.base.error(messageOrErr, { context: this.context, ...(meta ?? {}) });
    }
  }
}
