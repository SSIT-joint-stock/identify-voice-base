import {
  bullConfig,
  bullConfigFactory,
  databaseConfig,
  redisConfig,
  validateEnv,
} from '@/config';
import { PrismaModule } from '@/database/prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VoiceProcessor } from './voice/voice.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      load: [databaseConfig, bullConfig, redisConfig],
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}.local`,
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env.local',
        '.env',
        '../../.env',
        '../../.env.development',
        '../../../.env',
        '../../../.env.development',
      ],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: bullConfigFactory,
    }),
    PrismaModule,
  ],
  providers: [VoiceProcessor],
})
export class WorkerModule {}
