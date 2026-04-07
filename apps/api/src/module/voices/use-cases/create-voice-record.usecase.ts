import { PrismaService } from '@/database/prisma/prisma.service';
import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateVoiceRecordDto } from '../dto/create-voice-record.dto';

@Injectable()
export class CreateVoiceRecordUseCase implements BaseUseCase<
  CreateVoiceRecordDto,
  any
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: CreateVoiceRecordDto) {
    // Verify user exists
    const user = await this.prisma.users.findUnique({
      where: { id: dto.user_id },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${dto.user_id} not found`);
    }

    // If creating an active record, deactivate all existing active records for this user first
    if (dto.is_active !== false) {
      await this.prisma.voice_records.updateMany({
        where: { user_id: dto.user_id, is_active: true },
        data: { is_active: false },
      });
    }

    // Determine next version number
    const latestRecord = await this.prisma.voice_records.findFirst({
      where: { user_id: dto.user_id },
      orderBy: { version: 'desc' },
    });
    const nextVersion = latestRecord ? latestRecord.version + 1 : 1;

    return this.prisma.voice_records.create({
      data: {
        user_id: dto.user_id,
        user_name: user.name, // Snapshot name
        voice_id: dto.voice_id,
        audio_file_id: dto.audio_file_id,
        is_active: dto.is_active ?? true,
        version: dto.version ?? nextVersion,
      },
    });
  }
}
