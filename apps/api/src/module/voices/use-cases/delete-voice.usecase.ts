import { AiCoreService } from '@/module/ai-core/service/ai-core.service';
import { UploadService } from '@/module/upload/service/upload.service';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { VoicesRepository } from '../repository/voices.repository';

@Injectable()
export class DeleteVoiceUseCase {
  private readonly logger = new Logger(DeleteVoiceUseCase.name);

  constructor(
    private readonly voicesRepository: VoicesRepository,
    private readonly aiCoreService: AiCoreService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * Thực hiện quy trình xóa hồ sơ giọng nói (Biometric Destruction).
   * Quy trình: AI Destruction (Critical) -> File Cleanup (Best effort) -> DB Destruction (Final)
   *
   * @param userId ID của người dùng (User UUID)
   */
  async execute(userId: string): Promise<void> {
    // 0. Lấy thông tin cần thiết trước khi xóa
    const voiceData = await this.voicesRepository.findVoiceWithFiles(userId);

    if (!voiceData) {
      throw new NotFoundException(
        `Không tìm thấy hồ sơ giọng nói với ID: ${userId}`,
      );
    }

    const { voiceIds, audioFileIds } = voiceData;

    // 1. AI Destruction (Thao tác không thể hoàn tác - Phải chạy đầu tiên)
    // Nếu AI Service lỗi, quá trình sẽ dừng lại tại đây và DB vẫn còn nguyên.
    this.logger.log(
      `Starting AI destruction for user ${userId} (voices: ${voiceIds.join(', ')})`,
    );

    for (const voiceId of voiceIds) {
      await this.aiCoreService.deleteVoice(voiceId);
    }

    // 2. File Destruction (Best effort)
    // Xóa các file vật lý và soft-delete record audio_files.
    // Nếu lỗi xóa file, ta log lại nhưng vẫn tiến hành xóa DB để đảm bảo biometric data đã bị destroy.
    this.logger.log(
      `Cleaning up ${audioFileIds.length} audio files for user ${userId}`,
    );

    for (const fileId of audioFileIds) {
      try {
        await this.uploadService.deleteFile(fileId);
      } catch (error) {
        this.logger.error(
          `Failed to delete audio file ${fileId}: ${error.message}`,
        );
      }
    }

    // 3. DB Destruction (Final Step)
    // Xóa trắng record User và VoiceRecord khỏi hệ thống.
    this.logger.log(`Executing final DB destruction for user ${userId}`);
    await this.voicesRepository.hardDeleteVoice(userId);

    this.logger.log(
      `Successfully destroyed biometric profile for user ${userId}`,
    );
  }
}
