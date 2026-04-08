import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';

// config
import {
  aiCoreConfig,
  appConfig,
  bullConfigFactory,
  clientConfig,
  cookieConfig,
  databaseConfig,
  jwtConfig,
  rateLimitConfig,
  redisConfig,
  storageConfig,
  validateEnv,
} from './config';

// common
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpLogInterceptor } from './common/interceptors/http-logger.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

// modules
import { AiCoreModule } from '@/module/ai-core/ai-core.module';
import { LoggerModule } from './common/logger/logger.module';
import { PrismaModule } from './database/prisma/prisma.module';
import { AuthModule } from './module/auth/auth.module';
import { DocsModule } from './module/docs/docs.module';
import { EnrollModule } from './module/enroll/enroll.module';
import { IdentifyModule } from './module/identify/identify.module';
import { SessionsModule } from './module/sessions/sessions.module';
import { StorageModule } from './module/storage/storage.module';
import { UploadModule } from './module/upload/upload.module';
import { UserAuthModule } from './module/user-auth/user-auth.module';
import { VoicesModule } from './module/voices/voices.module';

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
        storageConfig,
        aiCoreConfig,
      ],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'storage'),
      serveRoot: '/cdn',
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
    UserAuthModule,
    StorageModule,
    UploadModule,
    VoicesModule,
    IdentifyModule,
    SessionsModule,
    AiCoreModule,
    EnrollModule,
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
