import { aiCoreConfig } from '@/config';
import { AiCoreUploadResponse } from '@/module/ai-core/dto/ai-core-response.dto';
import { HttpService } from '@nestjs/axios';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { AxiosError } from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { catchError, firstValueFrom } from 'rxjs';

@Injectable()
export class UploadVoiceUseCase {
  private readonly logger = new Logger(UploadVoiceUseCase.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(aiCoreConfig.KEY)
    private readonly config: ConfigType<typeof aiCoreConfig>,
  ) {}

  /**
   * Gửi file audio lên AI Service để xử lý Enrollment (Đăng ký giọng nói).
   * @param filePath Đường dẫn tuyệt đối của file audio trên đĩa
   * @param name Tên định danh cho giọng nói (thường là account id hoặc uuid)
   * @param mimeType (Optional) Mime type của file để server nhận diện chính xác
   */
  async execute(
    filePath: string,
    name: string,
    mimeType?: string,
  ): Promise<AiCoreUploadResponse> {
    const formData = new FormData();

    if (!fs.existsSync(filePath)) {
      throw new InternalServerErrorException(`File không tồn tại: ${filePath}`);
    }

    formData.append('file', fs.createReadStream(filePath), {
      filename: fs.existsSync(filePath) ? path.basename(filePath) : 'audio.wav',
      contentType: mimeType,
    });

    try {
      const { data } = await firstValueFrom(
        this.httpService
          .post(`${this.config.url}/upload_voice`, formData, {
            params: { name },
            headers: {
              ...formData.getHeaders(),
            },
            timeout: this.config.timeout,
          })
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(
                `AI Service Error [POST /upload_voice]: ${error.message}`,
                error.response?.data,
              );

              throw new InternalServerErrorException(
                error.response?.data?.['message'] ||
                  'Lỗi khi kết nối tới AI Service',
              );
            }),
          ),
      );

      return data;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;

      throw new InternalServerErrorException(
        `Lỗi không xác định khi gọi AI Service: ${error.message}`,
      );
    }
  }
}
