import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Permissions } from '@/common/decorators';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { type Response } from 'express';
import { GetSessionsFilterDto } from './dto/get-sessions-filter.dto';
import { SessionsRepository } from './repository/sessions.repository';
import { SessionsService } from './service/sessions.service';

@ApiTags('sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly sessionsRepository: SessionsRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách các phiên nhận dạng' })
  @ApiResponse({ status: 200 }) // Adjust type if needed
  @Permissions(['sessions.read'])
  async findAll(@Query() filter: GetSessionsFilterDto) {
    return this.sessionsRepository.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một phiên nhận dạng' })
  @ApiResponse({ status: 200 }) // Adjust type if needed
  @Permissions(['sessions.read'])
  async findOne(@Param('id') id: string) {
    return this.sessionsService.getSessionDetail(id);
  }

  @Get(':id/speakers/:label/audio')
  @ApiOperation({ summary: 'Nghe audio của từng speaker (On-demand merge)' })
  @Permissions(['sessions.read'])
  async getSpeakerAudio(
    @Param('id') id: string,
    @Param('label') label: string,
    @Res() res: Response,
  ) {
    return this.sessionsService.streamSpeakerAudio(id, label, res);
  }
}
