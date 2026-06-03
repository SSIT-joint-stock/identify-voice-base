import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable } from '@nestjs/common';
import type { auth_accounts } from '@prisma/client';
import { UpdateVoiceInfoDto } from '../dto/update-voice-info.dto';
import { VoicesRepository } from '../repository/voices.repository';

@Injectable()
export class UpdateVoiceInfoUseCase implements BaseUseCase<
  { id: string; dto: UpdateVoiceInfoDto; requester: auth_accounts },
  any
> {
  constructor(private readonly voicesRepository: VoicesRepository) {}

  async execute(params: {
    id: string;
    dto: UpdateVoiceInfoDto;
    requester: auth_accounts;
  }) {
    const { id, dto, requester } = params;

    const updatedUser = await this.voicesRepository.updateUserInfo(
      id,
      dto,
      requester,
    );

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      phone_number: updatedUser.phone_number,
      job: updatedUser.job,
      age: updatedUser.age,
      gender: updatedUser.gender,
      updated_at: new Date(), // Prisma usually handles this but we can return it as requested in docs
    };
  }
}
