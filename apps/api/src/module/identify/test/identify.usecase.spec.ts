import { Logger } from '@nestjs/common';
import { IdentifyUseCase } from '../use-cases/identify.use-case';
import {
  aiSpeaker,
  createIdentifyPrismaMock,
  identifyAudioFile,
  identifyFile,
} from './identify-test-utils';

describe(IdentifyUseCase.name, () => {
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

  function createUseCase(type: 'SINGLE' | 'MULTI' = 'SINGLE') {
    const prisma = createIdentifyPrismaMock();
    const uploadService = {
      uploadOne: jest.fn().mockResolvedValue(identifyAudioFile),
    };
    const aiCoreService = {
      identifySingle: jest.fn().mockResolvedValue({ speakers: [aiSpeaker] }),
      identifyMulti: jest.fn().mockResolvedValue({ speakers: [aiSpeaker] }),
      speechToText: jest.fn(),
      detectLanguage: jest.fn(),
    };
    const audioNormalizeService = {
      normalizeForAi: jest.fn().mockResolvedValue({
        path: '/tmp/normalized.wav',
        mimeType: 'audio/wav',
      }),
      cleanup: jest.fn().mockResolvedValue(undefined),
    };
    const sessionsRepository = {
      create: jest.fn().mockResolvedValue({
        id: 'session-1',
        identified_at: new Date('2026-01-01'),
      }),
    };

    return {
      prisma,
      uploadService,
      aiCoreService,
      audioNormalizeService,
      sessionsRepository,
      useCase: new IdentifyUseCase(
        prisma as never,
        uploadService as never,
        aiCoreService as never,
        audioNormalizeService as never,
        sessionsRepository as never,
        { rootDir: 'uploads', cdnUrl: 'http://cdn.local/cdn' } as never,
      ),
      type,
    };
  }

  it('identifies single-speaker audio, caches AI identities, stores session, and enriches business user', async () => {
    const { prisma, useCase, aiCoreService, sessionsRepository } =
      createUseCase();
    prisma.voice_records.findFirst.mockResolvedValue({
      is_active: true,
      user: {
        id: 'user-1',
        name: 'Business Name',
        citizen_identification: '999',
        phone_number: '0888',
        hometown: 'HN',
        job: 'Analyst',
        passport: 'P1',
        age: 33,
        gender: 'MALE',
        criminal_record: [],
        audio_url: 'http://cdn.local/enroll.wav',
      },
    });

    const result = await useCase.execute(identifyFile, 'operator-1', 'SINGLE');

    expect(aiCoreService.identifySingle).toHaveBeenCalledWith(
      '/tmp/normalized.wav',
      'audio/wav',
    );
    expect(prisma.ai_identities_cache.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { voice_id: 'voice-1' } }),
    );
    expect(sessionsRepository.create).toHaveBeenCalledWith({
      user_id: 'operator-1',
      audio_file_id: identifyAudioFile.id,
      results: {
        speakers: [aiSpeaker],
        transcript: null,
        detected_language: null,
        transcript_segments: [],
        speaker_transcripts: [],
      },
      transcript: null,
      detected_language: null,
    });
    expect(result.speakers[0]).toMatchObject({
      user_id: 'user-1',
      name: 'Business Name',
      score: 0.91,
    });
    expect(aiCoreService.speechToText).not.toHaveBeenCalled();
    expect(result.transcript).toBeNull();
    expect(result.detected_language).toBeNull();
  });

  it('adds speaker audio url for multi-speaker segments', async () => {
    const { prisma, useCase, aiCoreService } = createUseCase('MULTI');
    prisma.voice_records.findFirst.mockResolvedValue(null);

    const result = await useCase.execute(identifyFile, 'operator-1', 'MULTI');

    expect(aiCoreService.identifyMulti).toHaveBeenCalled();
    expect(result.speakers[0]).toMatchObject({
      audio_url:
        'http://api/v1.local/cdn/sessions/session-1/speakers/SPEAKER_1/audio',
    });
  });

  it('does not run S2T during multi-speaker identify because transcript is loaded lazily per speaker', async () => {
    const { useCase, aiCoreService } = createUseCase('MULTI');
    aiCoreService.identifyMulti.mockResolvedValue({
      speakers: [
        {
          ...aiSpeaker,
          speaker_label: 'SPEAKER_1',
          segments: [
            { start: 0, end: 2 },
            { start: 4, end: 5 },
          ],
        },
        {
          ...aiSpeaker,
          speaker_label: 'SPEAKER_2',
          matched_voice_id: null,
          segments: [{ start: 2, end: 4 }],
        },
      ],
    });

    const result = await useCase.execute(identifyFile, 'operator-1', 'MULTI');

    expect(aiCoreService.speechToText).not.toHaveBeenCalled();
    expect(result.transcript).toBeNull();
    expect(result.speaker_transcripts).toEqual([]);
  });
});
