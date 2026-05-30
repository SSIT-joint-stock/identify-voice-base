import { OCR, S2T, TRANSLATE } from '@/common/auth/permissions';
import { ApiSuccess, Permissions, RawResponse } from '@/common/decorators';
import { User } from '@/common/decorators/user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import {
  BatchFileTranslateDto,
  RetryBatchFileItemDto,
} from './dto/batch-file-translate.dto';
import { CreateBatchFileUseCase } from './use-cases/create-batch-file.usecase';
import { ExportBatchFileItemUseCase } from './use-cases/export-batch-file-item.usecase';
import { ExportBatchFileUseCase } from './use-cases/export-batch-file.usecase';
import { GetBatchFileUseCase } from './use-cases/get-batch-file.usecase';
import { RetryBatchFileItemUseCase } from './use-cases/retry-batch-file-item.usecase';

@ApiTags('batch-file')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ai-core/audio-translate-batches')
export class BatchFileController {
  constructor(
    private readonly createBatchFileUseCase: CreateBatchFileUseCase,
    private readonly getBatchFileUseCase: GetBatchFileUseCase,
    private readonly retryBatchFileItemUseCase: RetryBatchFileItemUseCase,
    private readonly exportBatchFileItemUseCase: ExportBatchFileItemUseCase,
    private readonly exportBatchFileUseCase: ExportBatchFileUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Tạo batch dịch nhiều file audio/tài liệu',
    description:
      'Nhận nhiều file audio/PDF/Word/ảnh, chạy S2T hoặc OCR và dịch nền theo queue để FE poll tiến trình từng file.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiSuccess('Tạo batch dịch file thành công')
  @UseInterceptors(FilesInterceptor('files', 100))
  @Permissions([S2T.RUN, OCR.RUN, TRANSLATE.RUN])
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: BatchFileTranslateDto,
    @User('id') userId: string,
  ) {
    return this.createBatchFileUseCase.execute({ files, dto, userId });
  }

  @Get(':batchId')
  @ApiOperation({
    summary: 'Lấy tiến trình batch dịch file',
    description:
      'Trả về trạng thái toàn batch và trạng thái OCR/S2T/dịch của từng file.',
  })
  @ApiSuccess('Lấy tiến trình batch dịch file thành công')
  @Permissions([S2T.RUN, OCR.RUN, TRANSLATE.RUN])
  async get(@Param('batchId') batchId: string) {
    return this.getBatchFileUseCase.execute(batchId);
  }

  @Post(':batchId/items/:itemId/retry')
  @ApiOperation({
    summary: 'Chạy lại một item trong batch dịch file',
  })
  @ApiSuccess('Chạy lại item dịch file thành công')
  @Permissions([S2T.RUN, OCR.RUN, TRANSLATE.RUN])
  async retry(
    @Param('batchId') batchId: string,
    @Param('itemId') itemId: string,
    @Body() dto: RetryBatchFileItemDto,
    @User('id') userId: string,
  ) {
    return this.retryBatchFileItemUseCase.execute({
      batchId,
      itemId,
      dto,
      userId,
    });
  }

  @Get(':batchId/items/:itemId/export')
  @ApiOperation({
    summary: 'Export bản dịch của một file trong batch',
  })
  @RawResponse()
  @Permissions([TRANSLATE.RUN])
  async exportItem(
    @Param('batchId') batchId: string,
    @Param('itemId') itemId: string,
    @Query('format') format: string | undefined,
    @Res() response: Response,
  ) {
    const file = await this.exportBatchFileItemUseCase.execute({
      batchId,
      itemId,
      format: this.getExportFormat(format),
    });

    this.sendBinaryFile(response, file);
  }

  @Get(':batchId/export')
  @ApiOperation({
    summary: 'Export toàn bộ bản dịch trong batch thành file ZIP',
  })
  @RawResponse()
  @Permissions([TRANSLATE.RUN])
  async exportBatch(
    @Param('batchId') batchId: string,
    @Query('format') format: string | undefined,
    @Res() response: Response,
  ) {
    const file = await this.exportBatchFileUseCase.execute({
      batchId,
      format: this.getExportFormat(format),
    });

    this.sendBinaryFile(response, file);
  }

  private sendBinaryFile(
    response: Response,
    file: { buffer: Buffer; filename: string; mimeType: string },
  ) {
    const encodedFilename = encodeURIComponent(file.filename);
    const fallbackFilename = file.filename
      .replace(/[^\x20-\x7e]+/g, '-')
      .replace(/"/g, '');

    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Length', file.buffer.length);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${fallbackFilename}"; filename*=UTF-8''${encodedFilename}`,
    );

    response.send(file.buffer);
  }

  private getExportFormat(format: string | undefined) {
    return format === 'pdf' ? 'pdf' : 'docx';
  }
}
