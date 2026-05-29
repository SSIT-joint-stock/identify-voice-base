import { InternalServerErrorException, Logger } from '@nestjs/common';
import { EnrollVoiceUseCase } from '../use-cases/enroll-voice.use-case';
import {
  createEnrollPrismaMock,
  enrollDto,
  multerFile,
  uploadedAudioFile,
} from './enroll-test-utils';

describe(EnrollVoiceUseCase.name, () => {
  let loggerLogSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    loggerLogSpy.mockRestore();
    loggerWarnSpy.mockRestore();
    loggerErrorSpy.mockRestore();
  });

  function createUseCase(overrides?: {
    prisma?: ReturnType<typeof createEnrollPrismaMock>;
    uploadService?: Record<string, jest.Mock>;
    core?: Record<string, jest.Mock>;
    audioNormalizeService?: Record<string, jest.Mock>;
  }) {
    const prisma = overrides?.prisma ?? createEnrollPrismaMock();
    const uploadService = overrides?.uploadService ?? {
      uploadOne: jest.fn().mockResolvedValue(uploadedAudioFile),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };
    const core = overrides?.core ?? {
      uploadVoice: jest.fn().mockResolvedValue({ voice_id: 'voice-1' }),
    };
    const audioNormalizeService = overrides?.audioNormalizeService ?? {
      normalizeForAi: jest.fn().mockResolvedValue({
        path: '/tmp/normalized.wav',
        mimeType: 'audio/wav',
      }),
      cleanup: jest.fn().mockResolvedValue(undefined),
    };

    return {
      prisma,
      uploadService,
      core,
      audioNormalizeService,
      useCase: new EnrollVoiceUseCase(
        prisma as never,
        uploadService as never,
        core as never,
        audioNormalizeService as never,
        { rootDir: 'uploads', cdnUrl: 'http://cdn.local' } as never,
      ),
    };
  }

  it('uploads audio, sends normalized file to AI Core, and stores user plus voice record', async () => {
    const { prisma, uploadService, core, useCase } = createUseCase();
    prisma.$transaction.mockImplementation((callback) =>
      callback({
        users: {
          create: jest.fn().mockResolvedValue({
            id: 'voice-1',
            name: enrollDto.name,
            age: enrollDto.age,
            gender: enrollDto.gender,
          }),
        },
        voice_records: {
          create: jest.fn().mockResolvedValue({
            created_at: new Date('2026-01-01'),
          }),
        },
      }),
    );

    const result = await useCase.execute(multerFile, enrollDto, 'operator-1');

    expect(uploadService.uploadOne).toHaveBeenCalledWith(
      multerFile,
      'ENROLL',
      'operator-1',
    );
    expect(core.uploadVoice).toHaveBeenCalledWith(
      '/tmp/normalized.wav',
      enrollDto.name,
      'audio/wav',
    );
    expect(result).toMatchObject({
      voice_id: 'voice-1',
      user_id: 'voice-1',
      audio_url: 'http://cdn.local/voices/audio.wav',
      name: enrollDto.name,
    });
  });

  it('rolls back uploaded file when AI Core does not return voice id', async () => {
    const { uploadService, core, useCase } = createUseCase({
      core: { uploadVoice: jest.fn().mockResolvedValue({}) },
    });

    await expect(
      useCase.execute(multerFile, enrollDto, 'operator-1'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(uploadService.deleteFile).toHaveBeenCalledWith(uploadedAudioFile.id);
    expect(core.uploadVoice).toHaveBeenCalled();
  });

  it('rolls back uploaded file when database transaction fails', async () => {
    const { prisma, uploadService, useCase } = createUseCase();
    prisma.$transaction.mockRejectedValue(new Error('db failed'));

    await expect(
      useCase.execute(multerFile, enrollDto, 'operator-1'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(uploadService.deleteFile).toHaveBeenCalledWith(uploadedAudioFile.id);
  });
});
