import { PrismaService } from '@/database/prisma/prisma.service';
import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ResetPasswordDto } from '../dto/reset-password.dto';

@Injectable()
export class ResetPasswordUseCase implements BaseUseCase<
  { userId: string; dto: ResetPasswordDto },
  void
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ userId, dto }: { userId: string; dto: ResetPasswordDto }) {
    const user = await this.prisma.auth_accounts.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Không tìm thấy tài khoản');
    }

    const isMatch = await bcrypt.compare(dto.old_password, user.password);
    if (!isMatch) {
      throw new ForbiddenException('Mật khẩu cũ không chính xác');
    }

    if (dto.new_password === dto.old_password) {
      throw new BadRequestException(
        'Mật khẩu mới không được trùng với mật khẩu cũ',
      );
    }

    const newHash = await bcrypt.hash(dto.new_password, 10);
    await this.prisma.auth_accounts.update({
      where: { id: userId },
      data: {
        password: newHash,
        refresh_token: null, // Logout all sessions
      },
    });
  }
}
