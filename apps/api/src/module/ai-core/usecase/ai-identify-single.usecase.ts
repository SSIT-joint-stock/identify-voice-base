import { aiCoreConfig } from '@/config';
import { HttpService } from '@nestjs/axios';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { AxiosError, AxiosResponse } from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { catchError, firstValueFrom } from 'rxjs';
import { AiCoreIdentifyResponse } from '../dto/ai-core-response.dto';

@Injectable()
export class AICoreIdentifySingleUseCase {
  private readonly logger = new Logger(AICoreIdentifySingleUseCase.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(aiCoreConfig.KEY)
    private readonly config: ConfigType<typeof aiCoreConfig>,
  ) {}

  /**
   * Nhận dạng 1 người nói từ file audio.
   * SLA: Toàn bộ pipeline phải hoàn thành trong ≤ 5 giây.
   * @param filePath Đường dẫn tuyệt đối của file audio
   * @param mimeType (Optional) Mime type của file
   */
  async execute(
    filePath: string,
    mimeType?: string,
  ): Promise<AiCoreIdentifyResponse[]> {
    const formData = new FormData();

    if (!fs.existsSync(filePath)) {
      throw new InternalServerErrorException(`File không tồn tại: ${filePath}`);
    }

    formData.append('file', fs.createReadStream(filePath), {
      filename: path.basename(filePath),
      contentType: mimeType,
    });

    try {
      const { data } = (await firstValueFrom(
        this.httpService
          .post<any, FormData>(`${this.config.url}/identify_voice/`, formData, {
            headers: {
              ...formData.getHeaders(),
            },
            timeout: this.config.timeout,
          })
          .pipe(
            catchError<AxiosResponse<any, FormData>, any>(
              (error: AxiosError) => {
                this.logger.error(
                  `AI Service Error [POST /identify_voice/]: ${error.message}`,
                  error.response?.data,
                );

                // 503 if timeout or AI service unavailable
                if (
                  error.code === 'ECONNABORTED' ||
                  error.response?.status === 503
                ) {
                  throw new InternalServerErrorException(
                    'AI Service timeout hoặc không phản hồi',
                  );
                }

                throw new InternalServerErrorException(
                  (error.response?.data as any)?.['message'] ||
                    'Lỗi nhận diện giọng nói từ AI Service',
                );
              },
            ),
          ),
      )) as AxiosResponse<AiCoreIdentifyResponse[]>;

      return data;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException(
        `Lỗi khi gọi AI Service: ${error.message}`,
      );
    }
  }
}
