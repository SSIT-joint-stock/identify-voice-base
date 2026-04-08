import { PrismaModule } from '@/database/prisma/prisma.module';
import { AuthTokenService } from '@/module/auth/service/auth-token.service';
import { Module } from '@nestjs/common';
import { AiCoreModule } from '../ai-core/ai-core.module';
import { SessionsModule } from '../sessions/sessions.module';
import { UploadModule } from '../upload/upload.module';
import { IdentifyController } from './identify.controller';
import { IdentifyService } from './service/identify.service';
import { IdentifyMultiUseCase } from './use-cases/identify-multi.use-case';
import { IdentifySingleUseCase } from './use-cases/identify-single.use-case';

@Module({
  imports: [PrismaModule, UploadModule, AiCoreModule, SessionsModule],
  controllers: [IdentifyController],
  providers: [
    IdentifyService,
    IdentifySingleUseCase,
    IdentifyMultiUseCase,
    AuthTokenService,
  ],
  exports: [IdentifyService],
})
export class IdentifyModule {}
