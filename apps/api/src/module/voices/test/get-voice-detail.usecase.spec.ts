import * as fs from 'fs';
import { GetVoiceDetailUseCase } from '../use-cases/get-voice-detail.usecase';
import { voiceRecord } from './voices-test-utils';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

describe(GetVoiceDetailUseCase.name, () => {
  it('returns active voice detail with history and audio availability', async () => {
    jest.mocked(fs.existsSync).mockReturnValue(true);
    const repository = {
      findDetail: jest.fn().mockResolvedValue({
        ...voiceRecord.user,
        voice_records: [voiceRecord],
      }),
      findIdentifyHistory: jest.fn().mockResolvedValue([
        {
          id: 'session-1',
          audio_file_id: 'audio-2',
          identified_at: new Date('2026-01-02'),
          results: [{ matched_voice_id: 'voice-1', score: 0.8 }],
        },
      ]),
    };

    const result = await new GetVoiceDetailUseCase(
      repository as never,
      { cdnUrl: 'http://cdn.local' } as never,
    ).execute('user-1');

    expect(result).toMatchObject({
      id: 'user-1',
      voice_id: 'voice-1',
      audio_available: true,
      identify_history: [expect.objectContaining({ score: 0.8 })],
    });
  });
});
