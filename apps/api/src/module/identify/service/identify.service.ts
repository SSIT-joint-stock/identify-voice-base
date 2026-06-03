import { Injectable } from '@nestjs/common';
import type { auth_accounts } from '@prisma/client';
import { IdentifyUseCase } from '../use-cases/identify.use-case';

@Injectable()
export class IdentifyService {
  constructor(private readonly identifyUseCase: IdentifyUseCase) {}

  /**
   * Nhận dạng nhận dạng giọng nói (tự động phân rã speaker 1-2 người)
   */
  async identify(
    file: Express.Multer.File,
    requester: auth_accounts,
    type: 'SINGLE' | 'MULTI',
  ) {
    return this.identifyUseCase.execute(file, requester, type);
  }
}
