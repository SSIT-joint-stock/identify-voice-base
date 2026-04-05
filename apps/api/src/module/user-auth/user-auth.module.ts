import { AuthTokenService } from '@/module/auth/service/auth-token.service';
import { Module } from '@nestjs/common';
import { UserService } from './service/user.service';
import { DeleteAccountUseCase } from './use-cases/delete-account.usecase';
import { GetMeUseCase } from './use-cases/get-me.usecase';
import { UpdateUserInfoUseCase } from './use-cases/update-info.usecase';
import { UserAuthController } from './user-auth.controller';

@Module({
  controllers: [UserAuthController],
  providers: [
    UserService,
    GetMeUseCase,
    UpdateUserInfoUseCase,
    DeleteAccountUseCase,
    AuthTokenService,
  ],
  exports: [UserService],
})
export class UserAuthModule {}
