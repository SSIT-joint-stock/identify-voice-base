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

import { VOICES } from '@/common/auth/permissions';
import { Permissions, ApiSuccess } from '@/common/decorators';
import { User } from '@/common/decorators/user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';

import { EnrollService } from '@/module/enroll/service/enroll.service';
import { EnrollVoiceDto } from './dto/enroll-voice.dto';

@ApiTags('enroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('voices')
export class EnrollController {
  constructor(private readonly enrollService: EnrollService) {}

  /**
   * POST /api/voices/enroll
   * Đăng ký giọng nói mới kèm thông tin cá nhân.
   */
  @Post('enroll')
  @ApiOperation({
    summary: 'Đăng ký giọng nói mới (Enroll)',
    description:
      'Nhận file audio + metadata cá nhân, lưu storage, kết nối AI Service để trích xuất embedding và lưu DB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Thông tin đăng ký bao gồm file audio và hồ sơ người dùng',
    schema: {
      type: 'object',
      required: ['audio', 'name'],
      properties: {
        audio: {
          type: 'string',
          format: 'binary',
          description: 'File âm thanh WAV/MP3/FLAC/OGG',
        },
        name: { type: 'string', example: 'Nguyễn Văn A' },
        citizen_identification: { type: 'string', example: '012345678901' },
        phone_number: { type: 'string', example: '0912345678' },
        hometown: { type: 'string', example: 'Hà Nội' },
        job: { type: 'string', example: 'Kỹ sư phần mềm' },
        passport: { type: 'string', example: 'B1234567' },
        age: { type: 'number', example: 30 },
        gender: {
          type: 'string',
          enum: ['MALE', 'FEMALE', 'OTHER'],
          example: 'MALE',
        },
        criminal_record: {
          type: 'string',
          example: '[{"case":"Trộm cắp tài sản","year":2021}]',
          description: 'Dạng JSON string của mảng các đối tượng tiền án',
        },
      },
    },
  })
  @ApiSuccess('Đăng ký giọng nói thành công')
  @UseInterceptors(FileInterceptor('audio'))
  @ApiSuccess('Đăng kí hồ sơ giọng nói thành công!')
  @Permissions([VOICES.ENROLL])
  async enroll(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: EnrollVoiceDto,
    @User('id') operatorId: string,
  ) {
    return this.enrollService.enroll(file, dto, operatorId);
  }
}
