import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { VoicesService } from './service/voices.service';
import { CreateVoiceRecordDto } from './dto/create-voice-record.dto';

@ApiTags('voices')
@Controller('voices')
export class VoicesController {
  constructor(private readonly voicesService: VoicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new voice record' })
  @ApiResponse({ status: 201, description: 'Voice record successfully created' })
  async create(@Body() dto: CreateVoiceRecordDto) {
    return this.voicesService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a voice record by ID' })
  @ApiParam({ name: 'id', description: 'Voice record UUID' })
  @ApiResponse({ status: 200, description: 'Voice record found' })
  @ApiResponse({ status: 404, description: 'Voice record not found' })
  async findOne(@Param('id') id: string) {
    return this.voicesService.findOne(id);
  }
}
