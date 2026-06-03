import * as fs from 'fs';
import { Role, UserStatus } from '@prisma/client';
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
        can_modify: false,
        access_source: 'MATCHED_SESSION',
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
    ).execute('user-1', {
      id: 'operator-1',
      email: 'operator@example.com',
      username: 'operator',
      password: 'hashed',
      role: Role.OPERATOR,
      permissions: [],
      refresh_token: null,
      status: UserStatus.ACTIVE,
    });

    expect(result).toMatchObject({
      id: 'user-1',
      voice_id: 'voice-1',
      audio_available: true,
      can_modify: false,
      access_source: 'MATCHED_SESSION',
      identify_history: [expect.objectContaining({ score: 0.8 })],
    });
  });
});
