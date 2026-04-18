import {
  getDefaultPermissionsForRole,
  normalizePermissions,
} from '@/common/auth/permissions';
import { BcryptService } from '@/common/helpers/bcrypt.util';
import { BadRequestError } from '@/common/response';
import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CreateAccountDto } from '../dto/create-account.dto';
import { UsersRepository } from '../repository/users.repository';

@Injectable()
export class CreateAccountUseCase implements BaseUseCase<
  CreateAccountDto,
  any
> {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly bcryptService: BcryptService,
  ) {}

  async execute(dto: CreateAccountDto) {
    await this.ensureUniqueAccount(dto.email, dto.username);

    const role = dto.role ?? Role.OPERATOR;
    const permissions =
      role === Role.ADMIN
        ? getDefaultPermissionsForRole(Role.ADMIN)
        : dto.permissions && dto.permissions.length > 0
          ? normalizePermissions(dto.permissions)
          : getDefaultPermissionsForRole(Role.OPERATOR);

    const password = await this.bcryptService.hashPassword(dto.password);

    const account = await this.usersRepository.create({
      email: dto.email,
      username: dto.username,
      password,
      role,
      status: dto.status,
      permissions,
    });

    return this.usersRepository.serializeAccount(account);
  }

  private async ensureUniqueAccount(email?: string, username?: string) {
    if (email) {
      const existingEmail = await this.usersRepository.findByEmail(email);

      if (existingEmail) {
        throw new BadRequestError('Email đã tồn tại trong hệ thống');
      }
    }

    if (username) {
      const existingUsername =
        await this.usersRepository.findByUsername(username);

      if (existingUsername) {
        throw new BadRequestError('Tên đăng nhập đã tồn tại trong hệ thống');
      }
    }
  }
}
