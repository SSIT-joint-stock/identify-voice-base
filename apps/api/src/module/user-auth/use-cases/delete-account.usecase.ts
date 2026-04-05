import { PrismaService } from '@/database/prisma/prisma.service';
import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';

@Injectable()
export class DeleteAccountUseCase implements BaseUseCase<string, any> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string) {
    const user = await this.prisma.auth_accounts.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng');
    }

    // Soft-delete: Cập nhật trạng thái thành INACTIVE
    await this.prisma.auth_accounts.update({
      where: { id: userId },
      data: {
        status: UserStatus.INACTIVE,
        refresh_token: null, // Đăng xuất tất cả các phiên làm việc
      },
    });

    return {
      message: 'Xóa tài khoản thành công',
    };
  }
}
