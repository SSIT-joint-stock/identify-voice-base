import { Injectable } from '@nestjs/common';
import { LoginUserDto } from '../dto/login-user.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { LoginUserUseCase } from '../use-cases/login-user.usecase';
import { LogoutUseCase } from '../use-cases/logout.usecase';
import { RefreshTokenUseCase } from '../use-cases/refresh-token.usecase';
import { ResetPasswordUseCase } from '../use-cases/reset-password.usecase';

@Injectable()
export class AuthService {
  constructor(
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  async login(dto: LoginUserDto) {
    return this.loginUserUseCase.execute(dto);
  }

  async refresh(refreshToken: string) {
    return this.refreshTokenUseCase.execute(refreshToken);
  }

  async logout(userId: string) {
    return this.logoutUseCase.execute(userId);
  }

  async resetPassword(userId: string, dto: ResetPasswordDto) {
    return this.resetPasswordUseCase.execute({ userId, dto });
  }
}
