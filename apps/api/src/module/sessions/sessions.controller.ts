import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { SessionsRepository } from '@/module/sessions/sessions.repository';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetSessionsFilterDto } from './dto/get-sessions-filter.dto';
import {
  SessionDetailDto,
  SessionListResponseDto,
} from './dto/session-response.dto';

@ApiTags('sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsRepository: SessionsRepository) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách các phiên nhận dạng' })
  @ApiResponse({ status: 200, type: SessionListResponseDto })
  async findAll(@Query() filter: GetSessionsFilterDto) {
    return this.sessionsRepository.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một phiên nhận dạng' })
  @ApiResponse({ status: 200, type: SessionDetailDto })
  async findOne(@Param('id') id: string) {
    return this.sessionsRepository.findOne(id);
  }
}
