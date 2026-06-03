import { VOICES } from '@/common/auth/permissions';
import { Permissions, ApiSuccess } from '@/common/decorators';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { User } from '@/common/decorators/user.decorator';
import {
  ApiBearerAuth,
  ApiConsumes,
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
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('voices')
export class VoicesController {
  constructor(private readonly voicesService: VoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách hồ sơ giọng nói (UC06)' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiSuccess('Lấy danh sách giọng nói thành công!')
  @Permissions([VOICES.READ])
  async findAll(@Query() filter: VoiceFilterDto, @User() user: auth_accounts) {
    return this.voicesService.findAll(filter, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết hồ sơ giọng nói (UC06)' })
  @ApiParam({ name: 'id', description: 'UUID của user' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hồ sơ' })
  @ApiSuccess('Lấy chi tiết giọng nói thành công!')
  @Permissions([VOICES.READ])
  async findOne(@Param('id') id: string, @User() user: auth_accounts) {
    return this.voicesService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân (UC06)' })
  @ApiParam({ name: 'id', description: 'UUID của user' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiSuccess('Cập nhật thông tin cá nhân thành công!')
  @Permissions([VOICES.UPDATE])
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVoiceInfoDto,
    @User() user: auth_accounts,
  ) {
    return this.voicesService.update(id, dto, user);
  }

  @Patch(':id/delete-voice')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa hồ sơ giọng nói khỏi AI core (UC07)' })
  @ApiParam({ name: 'id', description: 'UUID của user' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hồ sơ' })
  @ApiSuccess('Xóa hồ sơ giọng nói thành công!')
  @Permissions([VOICES.DELETE])
  async deleteVoice(@Param('id') id: string, @User() user: auth_accounts) {
    return this.voicesService.deleteVoice(id, user);
  }

  @Post(':id/update-from-audios')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Khởi tạo luồng cập nhật đặc trưng giọng nói (UC04)',
  })
  @ApiParam({ name: 'id', description: 'UUID của user' })
  @ApiSuccess('Yêu cầu cập nhật đã được đưa vào hàng đợi!')
  @Permissions([VOICES.UPDATE])
  async updateVoice(
    @Param('id') userId: string,
    @Body() dto: UpdateVoiceAudioDto,
    @User() user: auth_accounts,
  ) {
    if (!dto.audioIds || dto.audioIds.length === 0) {
      throw new BadRequestException('Bắt buộc phải có ít nhất 1 audio ID');
    }
    return this.voicesService.updateEmbedding(userId, dto.audioIds, user);
  }

  @Post(':id/denoise-enroll-audio')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lọc ồn và cập nhật lại audio đăng ký đang active',
  })
  @ApiParam({ name: 'id', description: 'UUID của user' })
  @ApiSuccess('Lọc ồn và cập nhật audio đăng ký thành công!')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio'))
  @Permissions([VOICES.UPDATE])
  async denoiseEnrollAudio(
    @Param('id') userId: string,
    @User() user: auth_accounts,
    @UploadedFile() filteredAudio?: Express.Multer.File,
  ) {
    return this.voicesService.denoiseEnrollAudio(userId, user, filteredAudio);
  }
}
