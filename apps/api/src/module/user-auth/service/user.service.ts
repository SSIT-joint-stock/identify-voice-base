import { Injectable } from '@nestjs/common';
import { AdminCreateAccountDto } from '../dto/admin-create-account.dto';
import { AdminGetAccountsFilterDto } from '../dto/admin-get-accounts-filter.dto';
import { AdminUpdateAccountDto } from '../dto/admin-update-account.dto';
import { UpdateAccountDto } from '../dto/update-account.dto';
import { AdminCreateAccountUseCase } from '../use-cases/admin-create-account.usecase';
import { AdminFindAllAccountsUseCase } from '../use-cases/admin-find-all-accounts.usecase';
import { AdminGetAccountDetailUseCase } from '../use-cases/admin-get-account-detail.usecase';
import { AdminUpdateAccountUseCase } from '../use-cases/admin-update-account.usecase';
import { DeleteAccountUseCase } from '../use-cases/delete-account.usecase';
import { GetMeUseCase } from '../use-cases/get-me.usecase';
import { UpdateAccountUseCase } from '../use-cases/update-account.usecase';

@Injectable()
export class UserService {
  constructor(
    private readonly getMeUseCase: GetMeUseCase,
    private readonly updateAccountUseCase: UpdateAccountUseCase,
    private readonly deleteAccountUseCase: DeleteAccountUseCase,
    private readonly adminCreateAccountUseCase: AdminCreateAccountUseCase,
    private readonly adminFindAllAccountsUseCase: AdminFindAllAccountsUseCase,
    private readonly adminGetAccountDetailUseCase: AdminGetAccountDetailUseCase,
    private readonly adminUpdateAccountUseCase: AdminUpdateAccountUseCase,
  ) {}

  async getMe(userId: string) {
    return this.getMeUseCase.execute(userId);
  }

  async updateAccount(userId: string, dto: UpdateAccountDto) {
    return this.updateAccountUseCase.execute({ userId, dto });
  }

  async deleteAccount(userId: string) {
    return this.deleteAccountUseCase.execute(userId);
  }

  async adminCreateAccount(dto: AdminCreateAccountDto) {
    return this.adminCreateAccountUseCase.execute(dto);
  }

  async adminFindAllAccounts(filter: AdminGetAccountsFilterDto) {
    return this.adminFindAllAccountsUseCase.execute(filter);
  }

  async adminFindOneAccount(id: string) {
    return this.adminGetAccountDetailUseCase.execute(id);
  }

  async adminUpdateAccount(id: string, dto: AdminUpdateAccountDto) {
    return this.adminUpdateAccountUseCase.execute({ id, dto });
  }
}
