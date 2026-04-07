import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';

import { PrismaModule } from '@/database/prisma/prisma.module';
import { StorageModule } from '@/module/storage/storage.module';
import storageConfig from '@/config/storage.config';

import { AuthTokenService } from '@/module/auth/service/auth-token.service';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { multerConfigFactory } from './upload.config';

@Module({
  imports: [
    ConfigModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [storageConfig.KEY],
      useFactory: multerConfigFactory,
    }),
    PrismaModule,
    StorageModule,
  ],
  providers: [UploadService, AuthTokenService],
  controllers: [UploadController],
  exports: [UploadService],
})
export class UploadModule {}
