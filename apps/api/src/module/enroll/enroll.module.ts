import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { UploadModule } from '../upload/upload.module';
import { EnrollController } from './enroll.controller';
import { EnrollService } from './enroll.service';
import { EnrollVoiceUseCase } from './use-cases/enroll-voice.use-case';

@Module({
  imports: [AiModule, UploadModule],
  controllers: [EnrollController],
  providers: [EnrollService, EnrollVoiceUseCase],
  exports: [EnrollService],
})
export class EnrollModule {}
