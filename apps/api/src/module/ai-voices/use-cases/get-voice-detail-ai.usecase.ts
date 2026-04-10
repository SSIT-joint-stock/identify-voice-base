import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable } from '@nestjs/common';
import { AiVoicesRepository } from '../repository/ai-voices.repository';

@Injectable()
export class GetAiVoiceDetailUseCase implements BaseUseCase<string, any> {
  constructor(private readonly aiVoicesRepository: AiVoicesRepository) {}

  async execute(voiceId: string) {
    return this.aiVoicesRepository.findById(voiceId);
  }
}
