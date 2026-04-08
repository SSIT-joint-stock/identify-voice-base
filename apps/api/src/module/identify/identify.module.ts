import { PrismaModule } from '@/database/prisma/prisma.module';
import { AuthTokenService } from '@/module/auth/service/auth-token.service';
import { Module } from '@nestjs/common';
import { AiCoreModule } from '../ai-core/ai-core.module';
import { SessionsModule } from '../sessions/sessions.module';
import { UploadModule } from '../upload/upload.module';
import { IdentifyController } from './identify.controller';
import { IdentifyService } from './service/identify.service';
import { IdentifyUseCase } from './use-cases/identify.use-case';

@Module({
  imports: [PrismaModule, UploadModule, AiCoreModule, SessionsModule],
  controllers: [IdentifyController],
  providers: [IdentifyService, IdentifyUseCase, AuthTokenService],
  exports: [IdentifyService],
})
export class IdentifyModule {}
