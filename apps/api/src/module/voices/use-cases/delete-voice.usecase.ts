import { AiCoreService } from '@/module/ai-core/service/ai-core.service';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { VoicesRepository } from '../repository/voices.repository';

@Injectable()
export class DeleteVoiceUseCase {
  private readonly logger = new Logger(DeleteVoiceUseCase.name);

  constructor(
    private readonly voicesRepository: VoicesRepository,
    private readonly aiCoreService: AiCoreService,
  ) {}

  async execute(userId: string): Promise<void> {
    this.logger.log(`Deleting voice profile for user ${userId}`);

    const voiceData = await this.voicesRepository.findVoiceWithFiles(userId);
    if (!voiceData) {
      throw new NotFoundException(
        `Không tìm thấy hồ sơ giọng nói với ID: ${userId}`,
      );
    }

    const voiceId = voiceData.voiceIds[0];
    if (!voiceId) {
      throw new NotFoundException('Người dùng này không có hồ sơ giọng nói');
    }

    await this.aiCoreService.deleteVoice(voiceId);
    await this.voicesRepository.deactivate(userId);

    this.logger.log(`Successfully deleted voice profile for user ${userId}`);
  }
}
