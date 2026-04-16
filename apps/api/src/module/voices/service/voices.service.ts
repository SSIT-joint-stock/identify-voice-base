import { Injectable } from '@nestjs/common';
import { UpdateVoiceInfoDto } from '../dto/update-voice-info.dto';
import { VoiceFilterDto } from '../dto/voice-filter.dto';
import { DeleteVoiceUseCase } from '../use-cases/delete-voice.usecase';
import { FindAllVoicesUseCase } from '../use-cases/find-all-voices.usecase';
import { GetVoiceDetailUseCase } from '../use-cases/get-voice-detail.usecase';
import { UpdateVoiceInfoUseCase } from '../use-cases/update-voice-info.usecase';
import { UpdateVoiceEmbeddingUseCase } from '../use-cases/update-voice-embedding.usecase';

@Injectable()
export class VoicesService {
  constructor(
    private readonly findAllVoicesUseCase: FindAllVoicesUseCase,
    private readonly getVoiceDetailUseCase: GetVoiceDetailUseCase,
    private readonly updateVoiceInfoUseCase: UpdateVoiceInfoUseCase,
    private readonly deleteVoiceUseCase: DeleteVoiceUseCase,
    private readonly updateVoiceEmbeddingUseCase: UpdateVoiceEmbeddingUseCase,
  ) {}

  async findAll(filter: VoiceFilterDto) {
    return this.findAllVoicesUseCase.execute(filter);
  }

  async findOne(id: string) {
    return this.getVoiceDetailUseCase.execute(id);
  }

  async update(id: string, dto: UpdateVoiceInfoDto) {
    return this.updateVoiceInfoUseCase.execute({ id, dto });
  }

  async deleteVoice(id: string) {
    return this.deleteVoiceUseCase.execute(id);
  }

  async updateEmbedding(userId: string, audioIds: string[], adminId: string) {
    return this.updateVoiceEmbeddingUseCase.execute(userId, audioIds, adminId);
  }
}
