import { Injectable } from '@nestjs/common';
import { CreateVoiceRecordUseCase } from '../use-cases/create-voice-record.usecase';
import { GetVoiceRecordUseCase } from '../use-cases/get-voice-record.usecase';
import { CreateVoiceRecordDto } from '../dto/create-voice-record.dto';

@Injectable()
export class VoicesService {
  constructor(
    private readonly createVoiceRecordUseCase: CreateVoiceRecordUseCase,
    private readonly getVoiceRecordUseCase: GetVoiceRecordUseCase,
  ) {}

  async create(dto: CreateVoiceRecordDto) {
    return this.createVoiceRecordUseCase.execute(dto);
  }

  async findOne(id: string) {
    return this.getVoiceRecordUseCase.execute(id);
  }

  async findAll() {
    // Standard service can still call prisma directly for simple queries if needed,
    // but here we follow the UC pattern if it's complex.
  }
}
