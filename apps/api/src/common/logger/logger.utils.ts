import type { Logger as WinstonLogger } from 'winston';
export const createContextLogger = (base: WinstonLogger, context: string) =>
  base.child({ context });
