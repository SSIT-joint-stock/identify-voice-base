import { PrismaModule } from '@/database/prisma/prisma.module';
import { AuthTokenService } from '@/module/auth/service/auth-token.service';
import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsRepository } from './sessions.repository';

@Module({
  imports: [PrismaModule],
  controllers: [SessionsController],
  providers: [SessionsRepository, AuthTokenService],
  exports: [SessionsRepository],
})
export class SessionsModule {}
