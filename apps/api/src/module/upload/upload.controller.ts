import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { audio_files } from '@prisma/client';

import { ApiSuccess } from '@/common/decorators';
import { User } from '@/common/decorators/user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

import { UploadAudioDto } from './dto/upload-audio.dto';
import { AudioValidationPipe } from './pipes/audio-validation.pipe';
import { UploadService } from './service/upload.service';

@ApiTags('upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * POST /api/v1/upload/audio
   * Upload một hoặc nhiều file audio. Trả về danh sách audio_file records.
   */
  @Post('audio')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Upload file audio',
    description:
      'Upload một hoặc nhiều file audio (WAV, MP3, FLAC, OGG ≤ 50MB, ≤ 10 phút). ' +
      'Trả về metadata của các file đã lưu.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File audio và mục đích upload',
    schema: {
      type: 'object',
      required: ['audio', 'purpose'],
      properties: {
        audio: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Một hoặc nhiều file WAV / MP3 / FLAC / OGG (≤ 50MB)',
        },
        purpose: {
          type: 'string',
          enum: ['ENROLL', 'IDENTIFY', 'UPDATE_VOICE'],
          description: 'Mục đích upload',
        },
      },
    },
  })
  @ApiSuccess('Upload thành công')
  @UseInterceptors(FilesInterceptor('audio', 10))
  async uploadAudio(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadAudioDto,
    @User('id') userId: string,
  ): Promise<audio_files[]> {
    // Tầng 2 — AudioValidationPipe: validate mimetype + purpose
    const pipe = new AudioValidationPipe();
    pipe.transform({ files, purpose: body.purpose });

    return this.uploadService.uploadMany(files, body.purpose, userId);
  }
}
