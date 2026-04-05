import { Injectable } from '@nestjs/common';
import { RegisterUserUseCase } from '../use-cases/register-user.usecase';
import { LoginUserUseCase } from '../use-cases/login-user.usecase';
import { RegisterUserDto } from '../dto/register-user.dto';
import { LoginUserDto } from '../dto/login-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
  ) {}

  async register(dto: RegisterUserDto) {
    return this.registerUserUseCase.execute(dto);
  }

  async login(dto: LoginUserDto) {
    return this.loginUserUseCase.execute(dto);
  }
}
