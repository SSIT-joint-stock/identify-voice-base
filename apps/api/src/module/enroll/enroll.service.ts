import { Injectable } from '@nestjs/common';
import { EnrollVoiceDto } from './dto/enroll-voice.dto';
import { EnrollVoiceUseCase } from './use-cases/enroll-voice.use-case';

@Injectable()
export class EnrollService {
  constructor(private readonly enrollVoiceUseCase: EnrollVoiceUseCase) {}

  /**
   * Tiếp nhận file audio từ Controller và thực thi Use Case đăng ký giọng nói.
   * Đây là phương thức duy nhất Service này cung cấp cho Controller.
   */
  async enroll(
    file: Express.Multer.File,
    dto: EnrollVoiceDto,
    operatorId: string,
  ) {
    return this.enrollVoiceUseCase.execute(file, dto, operatorId);
  }
}
