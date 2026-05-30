import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RedisModule } from '@/database/redis/redis.module';
import { AuthTokenService } from '@/module/auth/service/auth-token.service';
import { StorageModule } from '@/module/storage/storage.module';
import { TranslationHistoryModule } from '@/module/translation-history/translation-history.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AiCoreModule } from '../ai-core/ai-core.module';
import { BatchFileController } from './batch-file.controller';
import { BATCH_FILE_QUEUE } from './constants/batch-file.constants';
import { BatchFileQueueRepository } from './repository/batch-file-queue.repository';
import { BatchFileStorageRepository } from './repository/batch-file-storage.repository';
import { BatchFileRepository } from './repository/batch-file.repository';
import { CleanupBatchFileStorageUseCase } from './use-cases/cleanup-batch-file-storage.usecase';
import { CreateBatchFileUseCase } from './use-cases/create-batch-file.usecase';
import { ExportBatchFileItemUseCase } from './use-cases/export-batch-file-item.usecase';
import { ExportBatchFileUseCase } from './use-cases/export-batch-file.usecase';
import { GetBatchFileUseCase } from './use-cases/get-batch-file.usecase';
import { ProcessBatchFileItemUseCase } from './use-cases/process-batch-file-item.usecase';
import { ProcessBatchFileUseCase } from './use-cases/process-batch-file.usecase';
import { RefreshBatchFileSummaryUseCase } from './use-cases/refresh-batch-file-summary.usecase';
import { RetryBatchFileItemUseCase } from './use-cases/retry-batch-file-item.usecase';

@Module({
  imports: [
    RedisModule,
    TranslationHistoryModule,
    AiCoreModule,
    StorageModule,
    BullModule.registerQueue({
      name: BATCH_FILE_QUEUE,
    }),
  ],
  controllers: [BatchFileController],
  providers: [
    JwtAuthGuard,
    AuthTokenService,
    BatchFileRepository,
    BatchFileStorageRepository,
    BatchFileQueueRepository,
    CleanupBatchFileStorageUseCase,
    CreateBatchFileUseCase,
    GetBatchFileUseCase,
    RetryBatchFileItemUseCase,
    ExportBatchFileItemUseCase,
    ExportBatchFileUseCase,
    ProcessBatchFileUseCase,
    ProcessBatchFileItemUseCase,
    RefreshBatchFileSummaryUseCase,
  ],
  exports: [
    BatchFileRepository,
    BatchFileStorageRepository,
    BatchFileQueueRepository,
    CleanupBatchFileStorageUseCase,
    ProcessBatchFileUseCase,
    ProcessBatchFileItemUseCase,
  ],
})
export class BatchFileModule {}
