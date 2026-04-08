import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetSessionsFilterDto } from './dto/get-sessions-filter.dto';
import { SessionsRepository } from './repository/sessions.repository';
import { SessionsService } from './service/sessions.service';

@ApiTags('sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly sessionsRepository: SessionsRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách các phiên nhận dạng' })
  @ApiResponse({ status: 200 }) // Adjust type if needed
  async findAll(@Query() filter: GetSessionsFilterDto) {
    return this.sessionsRepository.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một phiên nhận dạng' })
  @ApiResponse({ status: 200 }) // Adjust type if needed
  async findOne(@Param('id') id: string) {
    return this.sessionsService.getSessionDetail(id);
  }
}
