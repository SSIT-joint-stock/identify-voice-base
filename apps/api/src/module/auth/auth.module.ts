import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthTokenService } from './service/auth-token.service';
import { AuthService } from './service/auth.service';
import { LoginUserUseCase } from './use-cases/login-user.usecase';
import { RegisterUserUseCase } from './use-cases/register-user.usecase';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.secret'),
        signOptions: { expiresIn: config.get('jwt.expiresIn') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokenService,
    RegisterUserUseCase,
    LoginUserUseCase,
  ],
  exports: [AuthService, AuthTokenService],
})
export class AuthModule {}
