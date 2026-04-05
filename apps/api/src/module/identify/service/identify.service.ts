import { Injectable } from '@nestjs/common';
import { StartIdentifySessionUseCase } from '../use-cases/start-identify-session.usecase';
import { StartIdentifyDto } from '../dto/start-identify.dto';

@Injectable()
export class IdentifyService {
  constructor(
    private readonly startIdentifySessionUseCase: StartIdentifySessionUseCase,
  ) {}

  async startSession(dto: StartIdentifyDto, userId: string) {
    return this.startIdentifySessionUseCase.execute({ ...dto, userId });
  }

  async getResult(sessionId: string) {
    // Logic to retrieve results from identify_sessions table
  }
}
