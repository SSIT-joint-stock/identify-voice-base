import { Injectable } from '@nestjs/common';
import type { auth_accounts } from '@prisma/client';
import { VoiceFilterDto } from '../dto/voice-filter.dto';
import { VoicesRepository } from '../repository/voices.repository';

@Injectable()
export class FindAllVoicesUseCase {
  constructor(private readonly voicesRepository: VoicesRepository) {}

  async execute(filter: VoiceFilterDto, requester: auth_accounts) {
    return this.voicesRepository.findActiveVoices(filter, requester);
  }
}
