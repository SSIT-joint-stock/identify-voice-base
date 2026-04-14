import { ApiSuccess } from '@/common/decorators';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { User } from '@/common/decorators/user.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { type auth_accounts } from '@prisma/client';
import { UpdateVoiceAudioDto } from './dto/update-voice-audio.dto';
import { UpdateVoiceInfoDto } from './dto/update-voice-info.dto';
import { VoiceFilterDto } from './dto/voice-filter.dto';
import { VoicesService } from './service/voices.service';

@ApiTags('voices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('voices')
export class VoicesController {
  constructor(private readonly voicesService: VoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách hồ sơ giọng nói (UC06)' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiSuccess('Lấy danh sách giọng nói thành công!')
  async findAll(@Query() filter: VoiceFilterDto) {
    return this.voicesService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết hồ sơ giọng nói (UC06)' })
  @ApiParam({ name: 'id', description: 'UUID của user' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hồ sơ' })
  @ApiSuccess('Lấy chi tiết giọng nói thành công!')
  async findOne(@Param('id') id: string) {
    return this.voicesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân (UC06)' })
  @ApiParam({ name: 'id', description: 'UUID của user' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiSuccess('Cập nhật thông tin cá nhân thành công!')
  async update(@Param('id') id: string, @Body() dto: UpdateVoiceInfoDto) {
    return this.voicesService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vô hiệu hóa hồ sơ giọng nói (UC07)' })
  @ApiParam({ name: 'id', description: 'UUID của user' })
  @ApiResponse({ status: 200, description: 'Vô hiệu hóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hồ sơ' })
  @ApiSuccess('Vô hiệu hóa hồ sơ giọng nói thành công!')
  async deactivate(@Param('id') id: string) {
    return this.voicesService.deactivate(id);
  }

  @Post(':id/update-from-audios')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Khởi tạo luồng cập nhật đặc trưng giọng nói (UC04)',
  })
  @ApiParam({ name: 'id', description: 'UUID của user' })
  @ApiSuccess('Yêu cầu cập nhật đã được đưa vào hàng đợi!')
  async updateVoice(
    @Param('id') userId: string,
    @Body() dto: UpdateVoiceAudioDto,
    @User() user: auth_accounts,
  ) {
    if (!dto.audioIds || dto.audioIds.length === 0) {
      throw new BadRequestException('Bắt buộc phải có ít nhất 1 audio ID');
    }
    return this.voicesService.updateEmbedding(userId, dto.audioIds, user.id);
  }
}
