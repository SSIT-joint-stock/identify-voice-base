import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IdentifyService } from './service/identify.service';
import { StartIdentifyDto } from './dto/start-identify.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@ApiTags('identify')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('identify')
export class IdentifyController {
  constructor(private readonly identifyService: IdentifyService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a voice identification session' })
  @ApiResponse({ status: 202, description: 'Session started and enqueued' })
  async start(@Body() dto: StartIdentifyDto, @Req() req: any) {
    const userId = req.user.sub;
    return this.identifyService.startSession(dto, userId);
  }
}
