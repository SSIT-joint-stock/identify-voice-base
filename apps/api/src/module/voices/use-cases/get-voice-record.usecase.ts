import { PrismaService } from '@/database/prisma/prisma.service';
import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class GetVoiceRecordUseCase implements BaseUseCase<string, any> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string) {
    const record = await this.prisma.voice_records.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!record) {
      throw new NotFoundException('Không tìm thấy hồ sơ giọng nói');
    }

    return record;
  }
}
