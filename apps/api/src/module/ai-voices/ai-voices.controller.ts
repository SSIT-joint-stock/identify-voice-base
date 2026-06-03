import { VOICES } from '@/common/auth/permissions';
import { Permissions, ApiSuccess } from '@/common/decorators';
import { User } from '@/common/decorators/user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { VoiceFilterDto } from '@/module/voices/dto/voice-filter.dto';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { type auth_accounts } from '@prisma/client';
import { ConvertAiVoiceUseCase } from './use-cases/convert-ai-voice.usecase';
import { FindAllAiVoicesUseCase } from './use-cases/find-all-ai-voices.usecase';
import { GetAiVoiceDetailUseCase } from './use-cases/get-voice-detail-ai.usecase';

@ApiTags('ai-voices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ai-voices')
export class AiVoicesController {
  constructor(
    private readonly findAllUseCase: FindAllAiVoicesUseCase,
    private readonly getDetailUseCase: GetAiVoiceDetailUseCase,
    private readonly convertUseCase: ConvertAiVoiceUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách các giọng nói AI gợi ý (AI Truth)' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiSuccess('Lấy danh sách AI voices thành công!')
  @Permissions([VOICES.READ])
  async findAll(@Query() filter: VoiceFilterDto, @User() user: auth_accounts) {
    return this.findAllUseCase.execute(filter, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết thông tin AI ghi nhận về giọng nói' })
  @ApiParam({ name: 'id', description: 'Voice ID (Qdrant point id)' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiSuccess('Lấy chi tiết AI voice thành công!')
  @Permissions([VOICES.READ])
  async findOne(@Param('id') id: string, @User() user: auth_accounts) {
    return this.getDetailUseCase.execute(id, user);
  }

  @Post(':id/convert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chuyển đổi AI gợi ý thành hồ sơ người dùng chính thức',
  })
  @ApiParam({ name: 'id', description: 'Voice ID (Qdrant point id)' })
  @ApiResponse({ status: 200, description: 'Chuyển đổi thành công' })
  @ApiSuccess('Chuyển đổi hồ sơ người dùng thành công!')
  @Permissions([VOICES.ENROLL])
  async convert(@Param('id') id: string, @User() user: auth_accounts) {
    return this.convertUseCase.execute(id, user);
  }
}
