import { Injectable } from '@nestjs/common';
import { IdentifySingleUseCase } from '../use-cases/identify-single.use-case';
import { IdentifyMultiUseCase } from '../use-cases/identify-multi.use-case';

@Injectable()
export class IdentifyService {
  constructor(
    private readonly identifySingleUseCase: IdentifySingleUseCase,
    private readonly identifyMultiUseCase: IdentifyMultiUseCase,
  ) {}

  /**
   * Nhận dạng 1 người nói (Single Identify).
   */
  async identifySingle(file: Express.Multer.File, operatorId: string) {
    return this.identifySingleUseCase.execute(file, operatorId);
  }

  /**
   * Nhận dạng tối đa 2 người nói (Multi Identify/Diarization).
   */
  async identifyMulti(file: Express.Multer.File, operatorId: string) {
    return this.identifyMultiUseCase.execute(file, operatorId);
  }
}
