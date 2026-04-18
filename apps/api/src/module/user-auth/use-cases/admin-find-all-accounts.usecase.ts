import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable } from '@nestjs/common';
import { AdminGetAccountsFilterDto } from '../dto/admin-get-accounts-filter.dto';
import { UsersRepository } from '../repository/users.repository';

@Injectable()
export class AdminFindAllAccountsUseCase implements BaseUseCase<
  AdminGetAccountsFilterDto,
  any
> {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(filter: AdminGetAccountsFilterDto) {
    const result = await this.usersRepository.findAll(filter);

    return {
      items: result.items.map((account) =>
        this.usersRepository.serializeAccount(account),
      ),
      pagination: result.pagination,
    };
  }
}
