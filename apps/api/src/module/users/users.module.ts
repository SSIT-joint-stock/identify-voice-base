import { BcryptService } from '@/common/helpers/bcrypt.util';
import { PrismaService } from '@/database/prisma/prisma.service';
import { AuthTokenService } from '@/module/auth/service/auth-token.service';
import { Module } from '@nestjs/common';
import { UsersRepository } from './repository/users.repository';
import { CreateAccountUseCase } from './use-cases/create-account.usecase';
import { FindAllAccountsUseCase } from './use-cases/find-all-accounts.usecase';
import { GetAccountDetailUseCase } from './use-cases/get-account-detail.usecase';
import { UpdateAccountUseCase } from './use-cases/update-account.usecase';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [
    PrismaService,
    UsersService,
    UsersRepository,
    CreateAccountUseCase,
    FindAllAccountsUseCase,
    GetAccountDetailUseCase,
    UpdateAccountUseCase,
    BcryptService,
    AuthTokenService,
  ],
})
export class UsersModule {}
