import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Injectable } from '@nestjs/common';
import { UpdateVoiceInfoDto } from '../dto/update-voice-info.dto';
import { VoicesRepository } from '../repository/voices.repository';

@Injectable()
export class UpdateVoiceInfoUseCase implements BaseUseCase<
  { id: string; dto: UpdateVoiceInfoDto },
  any
> {
  constructor(private readonly voicesRepository: VoicesRepository) {}

  async execute(params: { id: string; dto: UpdateVoiceInfoDto }) {
    const { id, dto } = params;

    const updatedUser = await this.voicesRepository.updateUserInfo(id, dto);

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
