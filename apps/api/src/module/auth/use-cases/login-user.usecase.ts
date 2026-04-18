import { resolveAccountPermissions } from '@/common/auth/permissions';
import { BcryptService } from '@/common/helpers/bcrypt.util';
import { UnauthorizedError } from '@/common/response';
import { PrismaService } from '@/database/prisma/prisma.service';
import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable } from '@nestjs/common';
import { LoginUserDto } from '../dto/login-user.dto';
import { AuthTokenService } from '../service/auth-token.service';
import { UserStatus } from '@prisma/client';

@Injectable()
export class LoginUserUseCase implements BaseUseCase<LoginUserDto, any> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authTokenService: AuthTokenService,
    private readonly bcrypt: BcryptService,
  ) {}

  async execute(dto: LoginUserDto) {
    const user = await this.prisma.auth_accounts.findUnique({
      where: { email: dto.email },
    });

    if (
      !user ||
      !(await this.bcrypt.comparePassword(dto.password, user.password))
    ) {
      throw new UnauthorizedError(
        'Tài khoản không tồn tại. Vui lòng thử lại sau!',
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedError('Tài khoản đã bị khóa');
    }

    const payload = {
      id: user.id,
      email: user.email,
      username: user.username || '',
      role: user.role,
      status: user.status,
      permissions: resolveAccountPermissions(user),
    };
    const { access_token, refresh_token } =
      this.authTokenService.generateTokenPair(payload);

    // Hash refresh token để lưu vào DB
    await this.prisma.auth_accounts.update({
      where: { id: user.id },
      data: { refresh_token: refresh_token },
    });

    return {
      access_token: access_token,
      refresh_token: refresh_token,
      expires_in: 900,
      account: {
        id: user.id,
        email: user.email,
        role: user.role,
        permissions: resolveAccountPermissions(user),
      },
    };
  }
}
