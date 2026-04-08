import { Injectable } from '@nestjs/common';
import { IdentifyUseCase } from '../use-cases/identify.use-case';

@Injectable()
export class IdentifyService {
  constructor(private readonly identifyUseCase: IdentifyUseCase) {}

  /**
   * Nhận dạng nhận dạng giọng nói (tự động phân rã speaker 1-2 người)
   */
  async identify(
    file: Express.Multer.File,
    operatorId: string,
    type: 'SINGLE' | 'MULTI',
  ) {
    return this.identifyUseCase.execute(file, operatorId, type);
  }
}
