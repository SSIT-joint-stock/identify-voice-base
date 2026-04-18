import { Permissions, ApiSuccess } from '@/common/decorators';
import { User } from '@/common/decorators/user.decorator';
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IdentifyService } from './service/identify.service';

@ApiTags('identify')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('identify')
export class IdentifyController {
  constructor(private readonly identifyService: IdentifyService) {}

  @Post()
  @ApiOperation({
    summary: 'Nhận dạng giọng nói',
    description:
      'Tải lên 1 file audio. Hệ thống tự động xác định 1-2 người nói, tách tiếng và nhận dạng từng người.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['SINGLE', 'MULTI'],
          description: 'Loại nhận dạng (1 người hoặc 2 người)',
          default: 'MULTI',
        },
        file: { type: 'string', format: 'binary', description: 'File ghi âm' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 200 }) // Dto currently isn't uniform yet, can ignore or create a unified Dto later
  @ApiSuccess('Nhận dạng thành công')
  @UseInterceptors(FileInterceptor('file'))
  @Permissions(['identify.run'])
  async identify(
    @UploadedFile() file: Express.Multer.File,
    @User('id') userId: string,
    @Body('type') type: 'SINGLE' | 'MULTI' = 'MULTI',
  ) {
    return this.identifyService.identify(file, userId, type);
  }
}
