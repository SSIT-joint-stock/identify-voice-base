import { PrismaService } from '@/database/prisma/prisma.service';
import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LogoutUseCase implements BaseUseCase<string, void> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string) {
    await this.prisma.auth_accounts.update({
      where: { id: userId },
      data: { refresh_token: null },
    });
  }
}
