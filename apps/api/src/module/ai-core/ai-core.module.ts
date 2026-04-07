import { AiCoreService } from '@/module/ai-core/ai-core.service';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [AiCoreService],
  exports: [AiCoreService],
})
export class AiCoreModule {}
