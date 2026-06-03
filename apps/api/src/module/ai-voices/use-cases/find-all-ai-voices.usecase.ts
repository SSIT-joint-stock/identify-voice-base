import { Injectable } from '@nestjs/common';
import type { auth_accounts } from '@prisma/client';
import { VoiceFilterDto } from '../../voices/dto/voice-filter.dto';
import { AiVoicesRepository } from '../repository/ai-voices.repository';

@Injectable()
export class FindAllAiVoicesUseCase {
  constructor(private readonly aiVoicesRepository: AiVoicesRepository) {}

  async execute(filter: VoiceFilterDto, requester?: auth_accounts) {
    return this.aiVoicesRepository.findNonEnrolled(filter, requester);
  }
}
