import { Injectable, Logger } from '@nestjs/common';
import { VoicesRepository } from '../repository/voices.repository';

@Injectable()
export class DeactivateVoiceUseCase {
  private readonly logger = new Logger(DeactivateVoiceUseCase.name);

  constructor(private readonly voicesRepository: VoicesRepository) {}

  /**
   * Vô hiệu hóa hồ sơ giọng nói thay vì xóa hoàn toàn (Archive instead of Destroy).
   *
   * @param userId ID của người dùng (User UUID)
   */
  async execute(userId: string): Promise<void> {
    this.logger.log(`Deactivating voice profile for user ${userId}`);
    await this.voicesRepository.deactivate(userId);
    this.logger.log(
      `Successfully deactivated voice profile for user ${userId}`,
    );
  }
}
