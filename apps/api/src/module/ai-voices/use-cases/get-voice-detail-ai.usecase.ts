import { Injectable } from '@nestjs/common';
import type { auth_accounts } from '@prisma/client';
import { AiVoicesRepository } from '../repository/ai-voices.repository';

@Injectable()
export class GetAiVoiceDetailUseCase {
  constructor(private readonly aiVoicesRepository: AiVoicesRepository) {}

  async execute(voiceId: string, requester?: auth_accounts) {
    return this.aiVoicesRepository.findById(voiceId, requester);
  }
}
