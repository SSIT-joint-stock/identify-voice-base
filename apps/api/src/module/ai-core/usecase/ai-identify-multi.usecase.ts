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
import { AiCoreMultiIdentifyResponse } from '../dto/ai-core-response.dto';

@Injectable()
export class AICoreIdentifyMultiUseCase {
  private readonly logger = new Logger(AICoreIdentifyMultiUseCase.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(aiCoreConfig.KEY)
    private readonly config: ConfigType<typeof aiCoreConfig>,
  ) {}

  /**
   * Nhận dạng hội thoại tối đa 2 người (Speaker Diarization).
   * Timeout mặc định 30 giây.
   * @param filePath Đường dẫn tuyệt đối của file audio
   * @param mimeType (Optional) Mime type của file
   */
  async execute(filePath: string, mimeType?: string) {
    const formData = new FormData();

    if (!fs.existsSync(filePath)) {
      throw new InternalServerErrorException(`File không tồn tại: ${filePath}`);
    }

    formData.append('file', fs.createReadStream(filePath), {
      filename: path.basename(filePath),
      contentType: mimeType,
    });

    try {
      const response = (await firstValueFrom(
        this.httpService
          .post<any, FormData>(
            `${this.config.url}/identify_2_voice/`,
            formData,
            {
              headers: {
                ...formData.getHeaders(),
              },
              timeout: this.config.timeout,
            },
          )
          .pipe(
            catchError<AxiosResponse<any, FormData>, any>(
              (error: AxiosError) => {
                this.logger.error(
                  `AI Service Error [POST /identify_2_voice/]: ${error.message}`,
                  error.response?.data,
                );

                // Handle specific 422 error from AI Service for too many speakers
                if (error.response?.status === 422) {
                  // Return a fake AxiosResponse-like object so destructuring works
                  return { data: error.response.data } as any;
                }

                throw new InternalServerErrorException(
                  (error.response?.data as any)?.['message'] ||
                    'Lỗi nhận diện hội thoại từ AI Service',
                );
              },
            ),
          ),
      )) as AxiosResponse<AiCoreMultiIdentifyResponse>;

      const { data } = response;

      // If data contains error details from 422
      if (data?.error === 'too_many_speakers') {
        return data;
      }

      return data;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException(
        `Lỗi khi gọi AI Service: ${error.message}`,
      );
    }
  }
}
