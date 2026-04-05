import { Module } from '@nestjs/common';
import { IdentifyController } from './identify.controller';
import { IdentifyService } from './service/identify.service';
import { StartIdentifySessionUseCase } from './use-cases/start-identify-session.usecase';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({
      name: 'voice-identification',
    }),
  ],
  controllers: [IdentifyController],
  providers: [IdentifyService, StartIdentifySessionUseCase],
  exports: [IdentifyService],
})
export class IdentifyModule {}
