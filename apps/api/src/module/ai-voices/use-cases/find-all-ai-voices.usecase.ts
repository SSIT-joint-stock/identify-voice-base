import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable } from '@nestjs/common';
import { VoiceFilterDto } from '../../voices/dto/voice-filter.dto';
import { AiVoicesRepository } from '../repository/ai-voices.repository';

@Injectable()
export class FindAllAiVoicesUseCase implements BaseUseCase<
  VoiceFilterDto,
  any
> {
  constructor(private readonly aiVoicesRepository: AiVoicesRepository) {}

  async execute(filter: VoiceFilterDto) {
    return this.aiVoicesRepository.findNonEnrolled(filter);
  }
}
