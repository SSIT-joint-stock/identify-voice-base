import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { VoicesService } from './service/voices.service';
import { CreateVoiceRecordDto } from './dto/create-voice-record.dto';

@ApiTags('voices')
@Controller('voices')
export class VoicesController {
  constructor(private readonly voicesService: VoicesService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo hồ sơ giọng nói mới' })
  @ApiResponse({
    status: 201,
    description: 'Hồ sơ giọng nói đã được tạo thành công',
  })
  async create(@Body() dto: CreateVoiceRecordDto) {
    return this.voicesService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy hồ sơ giọng nói theo ID' })
  @ApiParam({ name: 'id', description: 'UUID của hồ sơ giọng nói' })
  @ApiResponse({ status: 200, description: 'Tìm thấy hồ sơ giọng nói' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hồ sơ giọng nói' })
  async findOne(@Param('id') id: string) {
    return this.voicesService.findOne(id);
  }
}
