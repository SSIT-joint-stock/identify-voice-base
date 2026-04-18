import {
  getDefaultPermissionsForRole,
  normalizePermissions,
} from '@/common/auth/permissions';
import { BcryptService } from '@/common/helpers/bcrypt.util';
import { BadRequestError } from '@/common/response';
import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UpdateAccountDto } from '../dto/update-account.dto';
import { UsersRepository } from '../repository/users.repository';

interface UpdateAccountInput {
  id: string;
  dto: UpdateAccountDto;
}

@Injectable()
export class UpdateAccountUseCase implements BaseUseCase<
  UpdateAccountInput,
  any
> {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly bcryptService: BcryptService,
  ) {}

  async execute(input: UpdateAccountInput) {
    const { id, dto } = input;
    const account = await this.usersRepository.findByIdOrThrow(id);

    await this.ensureUniqueAccount(dto.email, dto.username, id);

    const nextRole = dto.role ?? account.role;
    const data: Record<string, unknown> = {
      email: dto.email,
      username: dto.username,
      role: nextRole,
      status: dto.status,
    };

    if (dto.password) {
      data.password = await this.bcryptService.hashPassword(dto.password);
      data.refresh_token = null;
    }

    if (nextRole === Role.ADMIN) {
      data.permissions = getDefaultPermissionsForRole(Role.ADMIN);
    } else if (dto.permissions !== undefined) {
      data.permissions =
        dto.permissions.length > 0
          ? normalizePermissions(dto.permissions)
          : getDefaultPermissionsForRole(Role.OPERATOR);
    } else if (dto.role === Role.OPERATOR && account.role !== Role.OPERATOR) {
      data.permissions = getDefaultPermissionsForRole(Role.OPERATOR);
    }

    const updatedAccount = await this.usersRepository.update(id, data);

    return this.usersRepository.serializeAccount(updatedAccount);
  }

  private async ensureUniqueAccount(
    email?: string,
    username?: string,
    excludeId?: string,
  ) {
    if (email) {
      const existingEmail = await this.usersRepository.findByEmail(email);

      if (existingEmail && existingEmail.id !== excludeId) {
        throw new BadRequestError('Email đã tồn tại trong hệ thống');
      }
    }

    if (username) {
      const existingUsername =
        await this.usersRepository.findByUsername(username);

      if (existingUsername && existingUsername.id !== excludeId) {
        throw new BadRequestError('Tên đăng nhập đã tồn tại trong hệ thống');
      }
    }
  }
}
