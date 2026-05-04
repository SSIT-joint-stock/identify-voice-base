import { OCR, S2T, TRANSLATE } from '@/common/auth/permissions';
import { ApiSuccess, Permissions, RawResponse } from '@/common/decorators';
import { User } from '@/common/decorators/user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import {
  OCR_LANGUAGES,
  SPEECH_TO_TEXT_LANGUAGES,
  TRANSLATION_LANGUAGES,
} from './constants/languages';
import { OcrRequestDto } from './dto/ocr-request.dto';
import { SpeechToTextRequestDto } from './dto/speech-to-text-request.dto';
import {
  DetectLanguageRequestDto,
  TranslateExportRequestDto,
  TRANSLATE_EXPORT_FORMATS,
  TranslateRequestDto,
} from './dto/translate-request.dto';
import { AiCoreService } from './service/ai-core.service';
import { AiExtractionJobService } from './service/ai-extraction-job.service';
import { AiTranslateJobService } from './service/ai-translate-job.service';
import { AudioNormalizeService } from './service/audio-normalize.service';
import { TranslateExportService } from './service/translate-export.service';
import { createReadStream } from 'fs';

@ApiTags('ai-core')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ai-core')
export class AiCoreController {
  constructor(
    private readonly aiCoreService: AiCoreService,
    private readonly extractionJobService: AiExtractionJobService,
    private readonly translateJobService: AiTranslateJobService,
    private readonly translateExportService: TranslateExportService,
    private readonly audioNormalizeService: AudioNormalizeService,
  ) {}

  @Post('audio/normalize')
  @ApiOperation({
    summary: 'Chuẩn hóa audio về WAV PCM 16-bit 16kHz mono',
    description:
      'Nhận audio đầu vào, decode và trả về file WAV chuẩn để FE dùng trước khi enroll hoặc identify.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File audio cần chuẩn hóa',
        },
      },
    },
  })
  @RawResponse()
  @UseInterceptors(FileInterceptor('file'))
  async normalizeAudio(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    const normalizedAudio =
      await this.audioNormalizeService.normalizeUploadedFileForAi(file);
    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      void this.audioNormalizeService.cleanup(normalizedAudio.path);
    };

    res.setHeader('Content-Type', normalizedAudio.mimeType);
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="normalized-audio.wav"',
    );
    res.once('finish', cleanup);
    res.once('close', cleanup);

    createReadStream(normalizedAudio.path).pipe(res);
  }

  @Post('ocr')
  @ApiOperation({
    summary: 'OCR file ảnh/PDF/DOCX/TXT qua AI CORE',
    description:
      'Proxy tới OCR API. Hỗ trợ .pdf, .png, .jpg, .jpeg, .txt, .docx.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File cần OCR',
        },
        language: {
          type: 'string',
          enum: [...OCR_LANGUAGES],
          default: 'vi',
        },
        format: {
          type: 'boolean',
          default: false,
          description: 'true: trả về plain text đã sắp xếp theo tọa độ',
        },
      },
    },
  })
  @ApiSuccess('OCR thành công')
  @UseInterceptors(FileInterceptor('file'))
  @Permissions([OCR.RUN])
  async ocr(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: OcrRequestDto,
  ) {
    return this.aiCoreService.ocr(file, dto);
  }

  @Post('ocr/jobs')
  @ApiOperation({
    summary: 'Tạo job OCR file ảnh/PDF/DOCX/TXT qua AI CORE',
    description: 'Tạo job OCR nền để FE có thể poll tiến trình theo phần trăm.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiSuccess('Tạo job OCR thành công')
  @UseInterceptors(FileInterceptor('file'))
  @Permissions([OCR.RUN])
  async createOcrJob(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: OcrRequestDto,
  ) {
    return this.extractionJobService.createOcrJob(file, dto);
  }

  @Post('speech-to-text')
  @ApiOperation({
    summary: 'Speech-to-Text qua AI CORE',
    description:
      'Proxy tới S2T API để chuyển file audio thành văn bản, có thể tự phát hiện ngôn ngữ.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File âm thanh WAV, MP3, OGG, ...',
        },
        language: {
          type: 'string',
          enum: [...SPEECH_TO_TEXT_LANGUAGES],
          nullable: true,
        },
        return_timestamp: {
          type: 'boolean',
          default: false,
        },
        denoise_audio: {
          type: 'boolean',
          default: false,
          description: 'true: yêu cầu AI CORE khử nhiễu audio trước khi S2T',
        },
      },
    },
  })
  @ApiSuccess('Speech-to-Text thành công')
  @UseInterceptors(FileInterceptor('file'))
  @Permissions([S2T.RUN])
  async speechToText(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: SpeechToTextRequestDto,
  ) {
    return this.aiCoreService.speechToText(file, dto);
  }

  @Post('speech-to-text/jobs')
  @ApiOperation({
    summary: 'Tạo job Speech-to-Text qua AI CORE',
    description: 'Tạo job S2T nền để FE có thể poll tiến trình theo phần trăm.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiSuccess('Tạo job Speech-to-Text thành công')
  @UseInterceptors(FileInterceptor('file'))
  @Permissions([S2T.RUN])
  async createSpeechToTextJob(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: SpeechToTextRequestDto,
  ) {
    return this.extractionJobService.createSpeechToTextJob(file, dto);
  }

  @Get('ocr/jobs/:jobId')
  @ApiOperation({
    summary: 'Lấy tiến trình job OCR',
    description: 'Trả về status, progress và result nếu job OCR đã hoàn thành.',
  })
  @ApiSuccess('Lấy tiến trình job OCR thành công')
  @Permissions([OCR.RUN])
  async getOcrJob(@Param('jobId') jobId: string) {
    return this.extractionJobService.getJob(jobId);
  }

  @Get('speech-to-text/jobs/:jobId')
  @ApiOperation({
    summary: 'Lấy tiến trình job Speech-to-Text',
    description: 'Trả về status, progress và result nếu job S2T đã hoàn thành.',
  })
  @ApiSuccess('Lấy tiến trình job Speech-to-Text thành công')
  @Permissions([S2T.RUN])
  async getSpeechToTextJob(@Param('jobId') jobId: string) {
    return this.extractionJobService.getJob(jobId);
  }

  @Post('translate')
  @ApiOperation({
    summary: 'Dịch văn bản qua AI CORE',
    description:
      'Proxy tới Translation API và validate target_lang trước khi gọi core.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['source_text'],
      properties: {
        source_text: {
          type: 'string',
          example: 'Xin chào thế giới',
        },
        target_lang: {
          type: 'string',
          enum: [...TRANSLATION_LANGUAGES],
          default: 'en',
          example: 'en',
        },
      },
    },
  })
  @ApiSuccess('Dịch văn bản thành công')
  @Permissions([TRANSLATE.RUN])
  async translate(
    @Body() dto: TranslateRequestDto,
    @User('id') userId: string,
  ) {
    return this.aiCoreService.translate(dto, userId);
  }

  @Post('translate/jobs')
  @ApiOperation({
    summary: 'Tạo job dịch văn bản qua AI CORE',
    description:
      'Tạo job dịch nền để FE có thể poll tiến trình theo phần trăm.',
  })
  @ApiSuccess('Tạo job dịch thành công')
  @Permissions([TRANSLATE.RUN])
  async createTranslateJob(
    @Body() dto: TranslateRequestDto,
    @User('id') userId: string,
  ) {
    return this.translateJobService.createJob('translate', dto, userId);
  }

  @Get('translate/jobs/:jobId')
  @ApiOperation({
    summary: 'Lấy tiến trình job dịch văn bản',
    description:
      'Trả về status, progress và result nếu job dịch đã hoàn thành.',
  })
  @ApiSuccess('Lấy tiến trình job dịch thành công')
  @Permissions([TRANSLATE.RUN])
  async getTranslateJob(@Param('jobId') jobId: string) {
    return this.translateJobService.getJob(jobId);
  }

  @Post('translate/export')
  @ApiOperation({
    summary: 'Xuất bản dịch sang DOCX hoặc PDF',
    description:
      'Tạo file DOCX/PDF từ nội dung đã dịch và trả về binary để FE tải xuống.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['text', 'format'],
      properties: {
        text: {
          type: 'string',
          example: 'Hello world',
        },
        format: {
          type: 'string',
          enum: [...TRANSLATE_EXPORT_FORMATS],
          example: 'docx',
        },
        filename: {
          type: 'string',
          example: 'ban-dich',
        },
        title: {
          type: 'string',
          example: 'Bản dịch',
        },
      },
    },
  })
  @RawResponse()
  @Permissions([TRANSLATE.RUN])
  async exportTranslate(
    @Body() dto: TranslateExportRequestDto,
    @Res() response: Response,
  ) {
    const file = await this.translateExportService.export(dto);
    const encodedFilename = encodeURIComponent(file.filename);
    const fallbackFilename = file.filename
      .replace(/[^\x20-\x7e]+/g, '-')
      .replace(/"/g, '');

    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Length', file.buffer.length);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${fallbackFilename}"; filename*=UTF-8''${encodedFilename}`,
    );

    response.send(file.buffer);
  }

  @Post('detect-language')
  @ApiOperation({
    summary: 'Phát hiện ngôn ngữ văn bản qua AI CORE',
    description: 'Proxy tới Translation API endpoint /detect_language.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['text'],
      properties: {
        text: {
          type: 'string',
          example: 'Hello world',
        },
      },
    },
  })
  @ApiSuccess('Phát hiện ngôn ngữ thành công')
  @Permissions([TRANSLATE.RUN])
  async detectLanguage(@Body() dto: DetectLanguageRequestDto) {
    return this.aiCoreService.detectLanguage(dto);
  }

  @Post('translate-summarize')
  @ApiOperation({
    summary: 'Dịch và tóm tắt văn bản qua AI CORE',
    description:
      'Proxy tới Translation API endpoint /translate_summarize và validate target_lang trước khi gọi core.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['source_text'],
      properties: {
        source_text: {
          type: 'string',
          example:
            'File đã được tạo xong với đầy đủ nội dung, bao gồm trang bìa, 5 phần chính, tất cả bảng biểu và chi tiết Use Case từ UC01 đến UC08.',
        },
        target_lang: {
          type: 'string',
          enum: [...TRANSLATION_LANGUAGES],
          default: 'en',
          example: 'vi',
        },
      },
    },
  })
  @ApiSuccess('Dịch và tóm tắt văn bản thành công')
  @Permissions([TRANSLATE.RUN])
  async translateSummarize(
    @Body() dto: TranslateRequestDto,
    @User('id') userId: string,
  ) {
    return this.aiCoreService.translateSummarize(dto, userId);
  }

  @Post('translate-summarize/jobs')
  @ApiOperation({
    summary: 'Tạo job dịch và tóm tắt văn bản qua AI CORE',
    description:
      'Tạo job dịch/tóm tắt nền để FE có thể poll tiến trình theo phần trăm.',
  })
  @ApiSuccess('Tạo job dịch và tóm tắt thành công')
  @Permissions([TRANSLATE.RUN])
  async createTranslateSummarizeJob(
    @Body() dto: TranslateRequestDto,
    @User('id') userId: string,
  ) {
    return this.translateJobService.createJob('summarize', dto, userId);
  }
}
