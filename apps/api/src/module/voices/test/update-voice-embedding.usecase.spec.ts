import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import { UpdateVoiceEmbeddingUseCase } from '../use-cases/update-voice-embedding.usecase';
import { createVoicesPrismaMock, voiceRecord } from './voices-test-utils';

describe(UpdateVoiceEmbeddingUseCase.name, () => {
  let loggerDebugSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    loggerDebugSpy.mockRestore();
    loggerWarnSpy.mockRestore();
  });

  it('creates update voice job and enqueues worker payload', async () => {
    const prisma = createVoicesPrismaMock();
    const queue = { add: jest.fn().mockResolvedValue(undefined) };
    prisma.voice_records.findFirst.mockResolvedValue(voiceRecord);
    prisma.update_voice_jobs.findMany.mockResolvedValue([]);
    prisma.update_voice_jobs.findFirst.mockResolvedValue(null);
    prisma.identify_sessions.findMany.mockResolvedValue([
      { audio_file_id: 'audio-2' },
      { audio_file_id: 'audio-3' },
    ]);
    prisma.update_voice_jobs.create.mockResolvedValue({
      id: 'job-1',
      created_at: new Date('2026-01-01'),
    });

    const result = await new UpdateVoiceEmbeddingUseCase(
      prisma as never,
      queue as never,
    ).execute('user-1', ['audio-2', 'audio-3'], 'admin-1');

    expect(result).toMatchObject({
      job_id: 'job-1',
      status: JobStatus.PENDING,
    });
    expect(queue.add).toHaveBeenCalledWith(
      'update-voice-job',
      expect.objectContaining({ jobId: 'job-1', voiceId: 'voice-1' }),
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it('rejects missing active voice, in-flight job, or invalid audio ids', async () => {
    const queue = { add: jest.fn() };
    let prisma = createVoicesPrismaMock();
    prisma.voice_records.findFirst.mockResolvedValue(null);
    await expect(
      new UpdateVoiceEmbeddingUseCase(prisma as never, queue as never).execute(
        'user-1',
        ['audio-2'],
        'admin-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma = createVoicesPrismaMock();
    prisma.voice_records.findFirst.mockResolvedValue(voiceRecord);
    prisma.update_voice_jobs.findMany.mockResolvedValue([]);
    prisma.update_voice_jobs.findFirst.mockResolvedValue({ id: 'job-active' });
    await expect(
      new UpdateVoiceEmbeddingUseCase(prisma as never, queue as never).execute(
        'user-1',
        ['audio-2'],
        'admin-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    prisma = createVoicesPrismaMock();
    prisma.voice_records.findFirst.mockResolvedValue(voiceRecord);
    prisma.update_voice_jobs.findMany.mockResolvedValue([]);
    prisma.update_voice_jobs.findFirst.mockResolvedValue(null);
    prisma.identify_sessions.findMany.mockResolvedValue([]);
    await expect(
      new UpdateVoiceEmbeddingUseCase(prisma as never, queue as never).execute(
        'user-1',
        ['audio-2'],
        'admin-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
