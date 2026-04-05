import { BullRootModuleOptions } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

export const bullEmailConfig = (
  config: ConfigService,
): BullRootModuleOptions => ({
  connection: {
    host: config.get<string>('REDIS_HOST', 'localhost'),
    port: config.get<number>('REDIS_PORT', 6379),
    password: config.get<string>('REDIS_PASSWORD', ''),
    family: 0,
  },
  // default job options
  defaultJobOptions: {
    attempts: 3, // retry 3 time if job fails
    backoff: { type: 'exponential', delay: 5000 }, // delay between retries
    removeOnComplete: 100, // keep only 100 completed jobs
    removeOnFail: 200, // keep only 200 failed jobs
  },
  // additional options
  prefix: 'bullmq', // prefix for keys in Redis
});
