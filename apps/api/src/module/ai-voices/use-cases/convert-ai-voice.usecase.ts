import { PrismaService } from '@/database/prisma/prisma.service';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { UserSource } from '@prisma/client';
import { AiVoicesRepository } from '../repository/ai-voices.repository';

@Injectable()
export class ConvertAiVoiceUseCase {
  private readonly logger = new Logger(ConvertAiVoiceUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiVoicesRepository: AiVoicesRepository,
  ) {}

  async execute(voiceId: string) {
    this.logger.log(`Bắt đầu chuyển đổi AI Voice sang User: ${voiceId}`);

    // 1. Kiểm tra tồn tại trong cache
    const cache = await this.aiVoicesRepository.findById(voiceId);

    // 2. Kiểm tra xem đã enroll chưa (đề phòng bấm nhầm)
    const existingRecord = await this.prisma.voice_records.findUnique({
      where: { voice_id: voiceId },
    });

    if (existingRecord) {
      throw new BadRequestException('Giọng nói này đã được đăng ký trước đó');
    }

    // 3. Tìm mẫu audio đầu tiên để làm Enroll Audio
    const firstSession =
      await this.aiVoicesRepository.findFirstSampleSession(voiceId);

    if (!firstSession) {
      this.logger.warn(
        `Không tìm thấy session nào chứa voice_id ${voiceId} để lấy mẫu audio.`,
      );
      // Có thể quăng lỗi hoặc cho phép tiếp tục nếu không bắt buộc audio tại thời điểm này.
      // Theo schema, voice_records.audio_file_id là bắt buộc, nên ta phải có audio.
      throw new BadRequestException(
        'Không tìm thấy mẫu âm thanh gốc để thực hiện đăng ký',
      );
    }

    // 4. Thực hiện chuyển đổi trong Transaction
    return this.prisma.$transaction(async (tx) => {
      // 4a. Tạo User từ thông tin cache
      const user = await tx.users.create({
        data: {
          name: cache.name || `Người dùng AI ${voiceId.slice(0, 8)}`,
          citizen_identification: cache.citizen_identification,
          phone_number: cache.phone_number,
          hometown: cache.hometown,
          job: cache.job,
          passport: cache.passport,
          criminal_record: cache.criminal_record || undefined,
          source: UserSource.AI_IMPORTED,
        },
      });

      // 4b. Tạo Voice Record chính thức
      const voiceRecord = await tx.voice_records.create({
        data: {
          user_id: user.id,
          voice_id: voiceId,
          audio_file_id: firstSession.audio_file_id,
          is_active: true,
        },
      });

      this.logger.log(
        `Chuyển đổi thành công: Cache ${voiceId} -> User ${user.id}`,
      );

      return {
        user_id: user.id,
        voice_id: voiceRecord.voice_id,
        status: 'CONVERTED',
      };
    });
  }
}
