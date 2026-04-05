import { Injectable } from '@nestjs/common';
import { UpdateUserDto } from '../dto/update-user.dto';
import { DeleteAccountUseCase } from '../use-cases/delete-account.usecase';
import { GetMeUseCase } from '../use-cases/get-me.usecase';
import { UpdateUserInfoUseCase } from '../use-cases/update-info.usecase';

@Injectable()
export class UserService {
  constructor(
    private readonly getMeUseCase: GetMeUseCase,
    private readonly updateUserInfoUseCase: UpdateUserInfoUseCase,
    private readonly deleteAccountUseCase: DeleteAccountUseCase,
  ) {}

  async getMe(userId: string) {
    return this.getMeUseCase.execute(userId);
  }

  async updateInfo(userId: string, dto: UpdateUserDto) {
    return this.updateUserInfoUseCase.execute({ userId, dto });
  }

  async deleteAccount(userId: string) {
    return this.deleteAccountUseCase.execute(userId);
  }
}
