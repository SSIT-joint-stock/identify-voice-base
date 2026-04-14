import {
  aiCoreConfig,
  bullConfig,
  bullConfigFactory,
  databaseConfig,
  redisConfig,
  storageConfig,
  validateEnv,
} from '@/config';
import { PrismaModule } from '@/database/prisma/prisma.module';
import { AiCoreModule } from '@/module/ai-core/ai-core.module';
import { StorageModule } from '@/module/storage/storage.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import { VoiceProcessor } from './voice/voice.processor';

const nodeEnv = process.env.NODE_ENV || 'development';
const workerEnvFiles = [
  resolve(process.cwd(), `../../.env.${nodeEnv}.local`),
  resolve(process.cwd(), `../../.env.${nodeEnv}`),
  resolve(process.cwd(), '../../.env.local'),
  resolve(process.cwd(), '../../.env'),
  resolve(process.cwd(), `.env.${nodeEnv}.local`),
  resolve(process.cwd(), `.env.${nodeEnv}`),
  resolve(process.cwd(), '.env.local'),
  resolve(process.cwd(), '.env'),
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: validateEnv,
      load: [
        aiCoreConfig,
        databaseConfig,
        bullConfig,
        redisConfig,
        storageConfig,
      ],
      envFilePath: workerEnvFiles,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: bullConfigFactory,
    }),
    BullModule.registerQueue({
      name: 'update-voice',
    }),
    AiCoreModule,
    PrismaModule,
    StorageModule,
  ],
  providers: [VoiceProcessor],
})
export class WorkerModule {}
