import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

// config
import {
  appConfig,
  bullConfigFactory,
  clientConfig,
  cookieConfig,
  databaseConfig,
  jwtConfig,
  rateLimitConfig,
  redisConfig,
  validateEnv,
} from './config';

// common
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpLogInterceptor } from './common/interceptors/http-logger.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

// modules
import { LoggerModule } from './common/logger/logger.module';
import { PrismaModule } from './database/prisma/prisma.module';
import { AuthModule } from './module/auth/auth.module';
import { IdentifyModule } from './module/identify/identify.module';
import { VoicesModule } from './module/voices/voices.module';
import { DocsModule } from './module/docs/docs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}.local`,
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env.local',
        '.env',
        '../../.env',
        '../../.env.development',
      ],
      validate: validateEnv,
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        rateLimitConfig,
        cookieConfig,
        clientConfig,
        redisConfig,
      ],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const throttlerConfig = config.get<{ ttl: number; limit: number }>(
          'throttler',
        );
        return [
          {
            ttl: (throttlerConfig?.ttl ?? 60) * 1000,
            limit: throttlerConfig?.limit ?? 10,
          },
        ];
      },
    }),
    PrismaModule,
    AuthModule,
    VoicesModule,
    IdentifyModule,
    DocsModule,
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: bullConfigFactory,
    }),
    LoggerModule.forFeature(['HTTP', 'APP']),
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLogInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
