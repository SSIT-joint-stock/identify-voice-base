import { BadRequestException, Logger } from '@nestjs/common';
import { UserSource } from '@prisma/client';
import { ConvertAiVoiceUseCase } from '../use-cases/convert-ai-voice.usecase';
import { cacheRecord, createAiVoicesPrismaMock } from './ai-voices-test-utils';

describe(ConvertAiVoiceUseCase.name, () => {
  let loggerLogSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;
  let prisma: ReturnType<typeof createAiVoicesPrismaMock>;

  beforeEach(() => {
    loggerLogSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    loggerWarnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    prisma = createAiVoicesPrismaMock();
  });

  afterEach(() => {
    loggerLogSpy.mockRestore();
    loggerWarnSpy.mockRestore();
  });

  it('converts AI cache into a user and active voice record', async () => {
    const aiRepository = {
      findById: jest.fn().mockResolvedValue(cacheRecord),
      findFirstSampleSession: jest
        .fn()
        .mockResolvedValue({ audio_file_id: 'audio-1' }),
    };
    prisma.voice_records.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockImplementation((callback) =>
      callback({
        users: {
          create: jest.fn().mockResolvedValue({ id: 'user-1' }),
        },
        voice_records: {
          create: jest.fn().mockResolvedValue({
            voice_id: cacheRecord.voice_id,
          }),
        },
      }),
    );

    const result = await new ConvertAiVoiceUseCase(
      prisma as never,
      aiRepository as never,
    ).execute(cacheRecord.voice_id);

    expect(result).toEqual({
      user_id: 'user-1',
      voice_id: cacheRecord.voice_id,
      status: 'CONVERTED',
    });
    const transactionCallback = prisma.$transaction.mock.calls[0][0];
    const tx = {
      users: { create: jest.fn().mockResolvedValue({ id: 'user-2' }) },
      voice_records: {
        create: jest.fn().mockResolvedValue({ voice_id: cacheRecord.voice_id }),
      },
    };
    await transactionCallback(tx);
    expect(tx.users.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: cacheRecord.name,
        source: UserSource.AI_IMPORTED,
      }),
    });
    expect(tx.voice_records.create).toHaveBeenCalledWith({
      data: {
        user_id: 'user-2',
        voice_id: cacheRecord.voice_id,
        audio_file_id: 'audio-1',
        is_active: true,
      },
    });
  });

  it('rejects already enrolled voice and missing sample audio', async () => {
    const aiRepository = {
      findById: jest.fn().mockResolvedValue(cacheRecord),
      findFirstSampleSession: jest.fn(),
    };

    prisma.voice_records.findFirst.mockResolvedValueOnce({
      id: 'voice-record-1',
    });
    await expect(
      new ConvertAiVoiceUseCase(prisma as never, aiRepository as never).execute(
        cacheRecord.voice_id,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.voice_records.findFirst.mockResolvedValueOnce(null);
    aiRepository.findFirstSampleSession.mockResolvedValueOnce(null);
    await expect(
      new ConvertAiVoiceUseCase(prisma as never, aiRepository as never).execute(
        cacheRecord.voice_id,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
