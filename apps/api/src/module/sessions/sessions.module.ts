import { SegmentUtil } from '@/common/helpers/segment.util';
import { PrismaModule } from '@/database/prisma/prisma.module';
import { AiCoreModule } from '@/module/ai-core/ai-core.module';
import { AuthTokenService } from '@/module/auth/service/auth-token.service';
import { Module } from '@nestjs/common';
import { SessionsRepository } from './repository/sessions.repository';
import { SessionsService } from './service/sessions.service';
import { SessionsController } from './sessions.controller';

@Module({
  imports: [PrismaModule, AiCoreModule],
  controllers: [SessionsController],
  providers: [
    SessionsRepository,
    SessionsService,
    AuthTokenService,
    SegmentUtil,
  ],
  exports: [SessionsRepository, SessionsService],
})
export class SessionsModule {}
