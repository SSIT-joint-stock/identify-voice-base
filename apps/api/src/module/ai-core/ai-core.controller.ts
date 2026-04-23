import { OCR, S2T, TRANSLATE } from '@/common/auth/permissions';
import { ApiSuccess, Permissions } from '@/common/decorators';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import {
  Body,
  Controller,
  Post,
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
import {
  OCR_LANGUAGES,
  SPEECH_TO_TEXT_LANGUAGES,
  TRANSLATION_LANGUAGES,
} from './constants/languages';
import { OcrRequestDto } from './dto/ocr-request.dto';
import { SpeechToTextRequestDto } from './dto/speech-to-text-request.dto';
import {
  DetectLanguageRequestDto,
  TranslateRequestDto,
} from './dto/translate-request.dto';
import { AiCoreService } from './service/ai-core.service';

@ApiTags('ai-core')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ai-core')
export class AiCoreController {
  constructor(private readonly aiCoreService: AiCoreService) {}

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
  async translate(@Body() dto: TranslateRequestDto) {
    return this.aiCoreService.translate(dto);
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
  async translateSummarize(@Body() dto: TranslateRequestDto) {
    return this.aiCoreService.translateSummarize(dto);
  }
}
