import { aiCoreConfig } from '@/config';
import { HttpService } from '@nestjs/axios';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { AxiosError, AxiosResponse } from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { catchError, firstValueFrom } from 'rxjs';
import {
  NormalizedIdentifyResponse,
  NormalizedSpeakerResult,
} from './ai-identify-single.usecase';

@Injectable()
export class AiIdentifyMultiUseCase {
  private readonly logger = new Logger(AiIdentifyMultiUseCase.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(aiCoreConfig.KEY)
    private readonly config: ConfigType<typeof aiCoreConfig>,
  ) {}

  async execute(
    filePath: string,
    mimeType?: string,
  ): Promise<NormalizedIdentifyResponse> {
    const formData = new FormData();

    if (!fs.existsSync(filePath)) {
      throw new InternalServerErrorException(`File không tồn tại: ${filePath}`);
    }

    formData.append('file', fs.createReadStream(filePath), {
      filename: path.basename(filePath),
      contentType: mimeType,
    });

    let aiResults: any;

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

                if (error.response?.status === 422) {
                  return { data: error.response.data } as any;
                }

                throw new InternalServerErrorException(
                  (error.response?.data as any)?.['message'] ||
                    'Lỗi nhận diện hội thoại MULTI từ AI Service',
                );
              },
            ),
          ),
      )) as AxiosResponse<any>;

      aiResults = response.data;
      console.log('AI MULTI RAW:', response.data);
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException(
        `Lỗi khi gọi AI Service (Multi): ${error.message}`,
      );
    }

    if (aiResults?.error === 'too_many_speakers') {
      throw new UnprocessableEntityException({
        message: `Hội thoại phát hiện ${aiResults.num_speakers} người nói — hệ thống chỉ hỗ trợ tối đa 2 người`,
        num_speakers: aiResults.num_speakers,
      });
    }

    let rawSpeakers;

    if (Array.isArray(aiResults)) {
      rawSpeakers = aiResults;
    } else if (
      aiResults &&
      aiResults.speakers &&
      Array.isArray(aiResults.speakers)
    ) {
      rawSpeakers = aiResults.speakers;
    }

    if (rawSpeakers.length === 0) {
      return { speakers: [] };
    }

    const speakers = rawSpeakers.map((s, index): NormalizedSpeakerResult => {
      return {
        speaker_label: s.label || s.speaker_label || `SPEAKER_${index + 1}`,
        matched_voice_id: s.matched_voice_id || null,
        score: s.score || null,
        name: s.name,
        citizen_identification: s.citizen_identification,
        phone_number: s.phone_number,
        hometown: s.hometown,
        job: s.job,
        passport: s.passport,
        criminal_record: s.criminal_record,
        segments: s.segments || s.audio_segment || [],
        raw_ai_data: s,
      };
    });

    return { speakers };
  }
}
