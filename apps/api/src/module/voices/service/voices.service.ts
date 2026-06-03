import { Injectable } from '@nestjs/common';
import type { auth_accounts } from '@prisma/client';
import { UpdateVoiceInfoDto } from '../dto/update-voice-info.dto';
import { VoiceFilterDto } from '../dto/voice-filter.dto';
import { DeleteVoiceUseCase } from '../use-cases/delete-voice.usecase';
import { FindAllVoicesUseCase } from '../use-cases/find-all-voices.usecase';
import { GetVoiceDetailUseCase } from '../use-cases/get-voice-detail.usecase';
import { UpdateVoiceInfoUseCase } from '../use-cases/update-voice-info.usecase';
import { UpdateVoiceEmbeddingUseCase } from '../use-cases/update-voice-embedding.usecase';
import { DenoiseEnrollAudioUseCase } from '../use-cases/denoise-enroll-audio.usecase';

@Injectable()
export class VoicesService {
  constructor(
    private readonly findAllVoicesUseCase: FindAllVoicesUseCase,
    private readonly getVoiceDetailUseCase: GetVoiceDetailUseCase,
    private readonly updateVoiceInfoUseCase: UpdateVoiceInfoUseCase,
    private readonly deleteVoiceUseCase: DeleteVoiceUseCase,
    private readonly updateVoiceEmbeddingUseCase: UpdateVoiceEmbeddingUseCase,
    private readonly denoiseEnrollAudioUseCase: DenoiseEnrollAudioUseCase,
  ) {}

  async findAll(filter: VoiceFilterDto, requester: auth_accounts) {
    return this.findAllVoicesUseCase.execute(filter, requester);
  }

  async findOne(id: string, requester: auth_accounts) {
    return this.getVoiceDetailUseCase.execute(id, requester);
  }

  async update(id: string, dto: UpdateVoiceInfoDto, requester: auth_accounts) {
    return this.updateVoiceInfoUseCase.execute({ id, dto, requester });
  }

  async deleteVoice(id: string, requester: auth_accounts) {
    return this.deleteVoiceUseCase.execute(id, requester);
  }

  async updateEmbedding(
    userId: string,
    audioIds: string[],
    requester: auth_accounts,
  ) {
    return this.updateVoiceEmbeddingUseCase.execute(
      userId,
      audioIds,
      requester,
    );
  }

  async denoiseEnrollAudio(
    userId: string,
    requester: auth_accounts,
    filteredAudio?: Express.Multer.File,
  ) {
    return this.denoiseEnrollAudioUseCase.execute(
      userId,
      requester,
      filteredAudio,
    );
  }
}
