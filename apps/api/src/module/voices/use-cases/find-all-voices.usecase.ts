import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable } from '@nestjs/common';
import { VoiceFilterDto } from '../dto/voice-filter.dto';
import { VoicesRepository } from '../repository/voices.repository';

@Injectable()
export class FindAllVoicesUseCase implements BaseUseCase<VoiceFilterDto, any> {
  constructor(private readonly voicesRepository: VoicesRepository) {}

  async execute(filter: VoiceFilterDto) {
    return this.voicesRepository.findActiveVoices(filter);
  }
}
