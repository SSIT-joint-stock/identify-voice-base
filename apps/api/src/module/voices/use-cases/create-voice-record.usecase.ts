import { PrismaService } from '@/database/prisma/prisma.service';
import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { ConflictException, Injectable } from '@nestjs/common';
import { CreateVoiceRecordDto } from '../dto/create-voice-record.dto';

@Injectable()
export class CreateVoiceRecordUseCase implements BaseUseCase<
  CreateVoiceRecordDto,
  any
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: CreateVoiceRecordDto) {
    const existing = await this.prisma.voice_records.findUnique({
      where: { cccd: dto.cccd },
    });

    if (existing) {
      throw new ConflictException('Voice record with this CCCD already exists');
    }

    return this.prisma.voice_records.create({
      data: {
        name: dto.name,
        cccd: dto.cccd,
        phone: dto.phone,
        audio_url: dto.audio_url,
        metadata: dto.metadata,
      },
    });
  }
}
