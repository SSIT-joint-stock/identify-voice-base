import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../repository/users.repository';

@Injectable()
export class FindAllAccountsUseCase implements BaseUseCase<void, any> {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute() {
    const accounts = await this.usersRepository.findAll();

    return accounts.map((account) =>
      this.usersRepository.serializeAccount(account),
    );
  }
}
