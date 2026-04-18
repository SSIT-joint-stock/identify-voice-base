import { Injectable } from '@nestjs/common';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateAccountUseCase } from './use-cases/create-account.usecase';
import { FindAllAccountsUseCase } from './use-cases/find-all-accounts.usecase';
import { GetAccountDetailUseCase } from './use-cases/get-account-detail.usecase';
import { UpdateAccountUseCase } from './use-cases/update-account.usecase';

@Injectable()
export class UsersService {
  constructor(
    private readonly createAccountUseCase: CreateAccountUseCase,
    private readonly findAllAccountsUseCase: FindAllAccountsUseCase,
    private readonly getAccountDetailUseCase: GetAccountDetailUseCase,
    private readonly updateAccountUseCase: UpdateAccountUseCase,
  ) {}

  async createAccount(dto: CreateAccountDto) {
    return this.createAccountUseCase.execute(dto);
  }

  async findAllAccounts() {
    return this.findAllAccountsUseCase.execute();
  }

  async findOneAccount(id: string) {
    return this.getAccountDetailUseCase.execute(id);
  }

  async updateAccount(id: string, dto: UpdateAccountDto) {
    return this.updateAccountUseCase.execute({ id, dto });
  }
}
