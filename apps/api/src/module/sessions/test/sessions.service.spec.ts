import { SegmentUtil } from '@/common/helpers/segment.util';
import { AudioSegmentService } from '@/module/ai-core/service/audio-segment.service';
import { Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { SessionsService } from '../service/sessions.service';
import { createSessionsPrismaMock, sessionRecord } from './sessions-test-utils';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

describe(SessionsService.name, () => {
  let loggerErrorSpy: jest.SpyInstance;
  let prisma: ReturnType<typeof createSessionsPrismaMock>;
  let service: SessionsService;

  beforeEach(() => {
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    prisma = createSessionsPrismaMock();
    service = new SessionsService(
      prisma as never,
      {
        buildSpeakerAudio: jest.fn().mockResolvedValue('/tmp/speaker.wav'),
      } as unknown as AudioSegmentService,
      {
        extractSegments: jest.fn((speaker) => speaker?.segments ?? []),
      } as unknown as SegmentUtil,
      { rootDir: 'uploads', cdnUrl: 'http://cdn.local/cdn' } as never,
    );
    jest.clearAllMocks();
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  it('returns enriched business speaker detail', async () => {
    prisma.identify_sessions.findUnique.mockResolvedValue(sessionRecord);
    prisma.voice_records.findFirst.mockResolvedValue({
      user: {
        name: 'Business User',
        citizen_identification: '999',
        phone_number: '0888',
        hometown: 'HN',
        job: 'Engineer',
        passport: 'P1',
        age: 30,
        gender: 'MALE',
        criminal_record: [],
        audio_url: 'http://cdn.local/enroll.wav',
      },
    });

    const result = await service.getSessionDetail('session-1');

    expect(result.speakers[0]).toMatchObject({
      name: 'Business User',
      truth_source: 'BUSINESS',
      audio_url:
        'http://api/v1.local/cdn/sessions/session-1/speakers/SPEAKER_1/audio',
    });
  });

  it('falls back to AI cache or unknown speaker detail', async () => {
    prisma.identify_sessions.findUnique.mockResolvedValue(sessionRecord);
    prisma.voice_records.findFirst.mockResolvedValue(null);
    prisma.ai_identities_cache.findUnique.mockResolvedValue({
      name: 'AI Cache',
    });

    await expect(service.getSessionDetail('session-1')).resolves.toMatchObject({
      speakers: [
        expect.objectContaining({ name: 'AI Cache', truth_source: 'AI' }),
      ],
    });

    prisma.ai_identities_cache.findUnique.mockResolvedValue(null);
    await expect(service.getSessionDetail('session-1')).resolves.toMatchObject({
      speakers: [
        expect.objectContaining({ name: 'Unknown', truth_source: 'NONE' }),
      ],
    });
  });

  it('throws when session detail is missing', async () => {
    prisma.identify_sessions.findUnique.mockResolvedValue(null);

    await expect(service.getSessionDetail('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('streams speaker audio and removes temporary file after send', async () => {
    const sendFile = jest.fn((_path, callback) => callback());
    const res = { sendFile } as never;
    prisma.identify_sessions.findUnique.mockResolvedValue({
      ...sessionRecord,
      audio_file: { file_path: 'identify/audio.wav' },
    });
    jest.mocked(fs.existsSync).mockReturnValue(true);

    await service.streamSpeakerAudio('session-1', 'SPEAKER_1', res);

    expect(sendFile).toHaveBeenCalledWith(
      '/tmp/speaker.wav',
      expect.any(Function),
    );
    expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/speaker.wav');
  });
});
