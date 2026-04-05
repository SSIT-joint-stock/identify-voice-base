import { PrismaService } from '@/database/prisma/prisma.service';
import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { ConflictException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { RegisterUserDto } from '../dto/register-user.dto';

@Injectable()
export class RegisterUserUseCase implements BaseUseCase<RegisterUserDto, any> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: RegisterUserDto) {
    const existingUser = await this.prisma.auth_accounts.findUnique({
      where: { username: dto.username },
    });

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const { ...rest } = await this.prisma.auth_accounts.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        role: dto.role ?? Role.ADMIN,
      },
    });

    return rest;
  }
}
