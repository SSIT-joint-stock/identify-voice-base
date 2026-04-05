import { BcryptService } from '@/common/helpers/bcrypt.util';
import { cookieConfig } from '@/config';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthTokenService } from './service/auth-token.service';
import { AuthService } from './service/auth.service';
import { LoginUserUseCase } from './use-cases/login-user.usecase';
import { LogoutUseCase } from './use-cases/logout.usecase';
import { RefreshTokenUseCase } from './use-cases/refresh-token.usecase';
import { ResetPasswordUseCase } from './use-cases/reset-password.usecase';

@Module({
  imports: [
    PassportModule,
    ConfigModule.forFeature(cookieConfig),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.secret'),
        signOptions: { expiresIn: config.get('jwt.expiresIn') || '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokenService,
    LoginUserUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    ResetPasswordUseCase,
    BcryptService,
  ],
  exports: [AuthService, AuthTokenService],
})
export class AuthModule {}
