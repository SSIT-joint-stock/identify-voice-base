import { EnrollVoiceDto } from '@/module/enroll/dto/enroll-voice.dto';
import { Injectable } from '@nestjs/common';
import { EnrollVoiceUseCase } from '../use-cases/enroll-voice.use-case';

@Injectable()
export class EnrollService {
  constructor(private readonly enrollVoiceUseCase: EnrollVoiceUseCase) {}

  async enroll(
    file: Express.Multer.File,
    dto: EnrollVoiceDto,
    operatorId: string,
  ) {
    return this.enrollVoiceUseCase.execute(file, dto, operatorId);
  }
}
