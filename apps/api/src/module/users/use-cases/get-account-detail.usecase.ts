import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../repository/users.repository';

@Injectable()
export class GetAccountDetailUseCase implements BaseUseCase<string, any> {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(id: string) {
    const account = await this.usersRepository.findByIdOrThrow(id);

    return this.usersRepository.serializeAccount(account);
  }
}
