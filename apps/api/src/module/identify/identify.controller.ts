import { ApiSuccess } from '@/common/decorators';
import { User } from '@/common/decorators/user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import {
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
import { MultiIdentifyDataDto } from './dto/multi-identify-response.dto';
import { SingleIdentifyDataDto } from './dto/single-identify-response.dto';
import { IdentifyService } from './service/identify.service';

@ApiTags('identify')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('identify')
export class IdentifyController {
  constructor(private readonly identifyService: IdentifyService) {}

  @Post('single')
  @ApiOperation({
    summary: 'Nhận dạng giọng nói (1 người)',
    description: 'Tải lên 1 file audio để tìm kiếm danh tính trong DB. SLA: 5s',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'File ghi âm' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 200, type: SingleIdentifyDataDto })
  @ApiSuccess('Nhận dạng thành công')
  @UseInterceptors(FileInterceptor('file'))
  async identifySingle(
    @UploadedFile() file: Express.Multer.File,
    @User('id') userId: string,
  ) {
    return this.identifyService.identifySingle(file, userId);
  }

  @Post('multi')
  @ApiOperation({
    summary: 'Nhận dạng hội thoại (Diarization + Identify)',
    description:
      'Tải lên 1 file audio hội thoại (tối đa 2 người). Hệ thống sẽ tách tiếng và nhận dạng từng người. SLA: 30s',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'File ghi âm' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 200, type: MultiIdentifyDataDto })
  @ApiSuccess('Nhận dạng hội thoại thành công')
  @UseInterceptors(FileInterceptor('file'))
  async identifyMulti(
    @UploadedFile() file: Express.Multer.File,
    @User('id') userId: string,
  ) {
    return this.identifyService.identifyMulti(file, userId);
  }
}
