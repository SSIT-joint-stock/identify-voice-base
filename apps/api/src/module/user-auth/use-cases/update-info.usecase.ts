import { BadRequestError } from '@/common/response';
import { PrismaService } from '@/database/prisma/prisma.service';
import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from '../dto/update-user.dto';

interface UpdateUserInfoInput {
  userId: string;
  dto: UpdateUserDto;
}

@Injectable()
export class UpdateUserInfoUseCase implements BaseUseCase<
  UpdateUserInfoInput,
  any
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: UpdateUserInfoInput) {
    const { userId, dto } = input;

    const user = await this.prisma.auth_accounts.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // Check email uniqueness if updating
    if (dto.email && dto.email !== user.email) {
      const emailExists = await this.prisma.auth_accounts.findUnique({
        where: { email: dto.email },
      });
      if (emailExists) {
        throw new BadRequestError('Email đã tồn tại trong hệ thống');
      }
    }

    // Check username uniqueness if updating
    if (dto.username && dto.username !== user.username) {
      const usernameExists = await this.prisma.auth_accounts.findUnique({
        where: { username: dto.username },
      });
      if (usernameExists) {
        throw new BadRequestError('Tên đăng nhập đã tồn tại trong hệ thống');
      }
    }

    const updatedUser = await this.prisma.auth_accounts.update({
      where: { id: userId },
      data: {
        email: dto.email,
        username: dto.username,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        status: true,
      },
    });

    return updatedUser;
  }
}
