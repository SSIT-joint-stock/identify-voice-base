import { aiCoreConfig } from '@/config';
import { HttpService } from '@nestjs/axios';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';

@Injectable()
export class AiDeleteVoiceUseCase {
  private readonly logger = new Logger(AiDeleteVoiceUseCase.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(aiCoreConfig.KEY)
    private readonly config: ConfigType<typeof aiCoreConfig>,
  ) {}

  /**
   * Xóa bản ghi giọng nói khỏi Qdrant theo voice_id.
   * @param voiceId ID của bản ghi giọng nói cần xóa
   */
  async execute(voiceId: string): Promise<void> {
    if (!voiceId) {
      throw new InternalServerErrorException('voice_id không được để trống');
    }

    try {
      await firstValueFrom(
        this.httpService
          .delete(`${this.config.url}/delete_record/`, {
            params: { voice_id: voiceId },
            timeout: this.config.timeout,
          })
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(
                `AI Service Error [DELETE /delete_record]: ${error.message}`,
                error.response?.data,
              );

              // Nếu 400 và nội dung là "No exist ID", coi như đã xóa (Idempotent)
              const detail = error.response?.data?.['detail'];
              if (
                error.response?.status === 400 &&
                detail?.includes('No exist ID')
              ) {
                this.logger.warn(
                  `voice_id ${voiceId} không tồn tại trong Qdrant.`,
                );
                return [];
              }

              throw new InternalServerErrorException(
                error.response?.data?.['detail'] ||
                  'Lỗi khi kết nối tới AI Service để xóa giọng nói',
              );
            }),
          ),
      );
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;

      throw new InternalServerErrorException(
        `Lỗi không xác định khi gọi AI Service: ${error.message}`,
      );
    }
  }
}
