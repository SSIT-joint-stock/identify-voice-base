export const sessionRecord = {
  id: 'session-1',
  user_id: 'operator-1',
  audio_file_id: 'audio-1',
  identified_at: new Date('2026-01-01'),
  operator: { id: 'operator-1', username: 'operator' },
  audio_file: { file_path: 'identify/audio.wav' },
  results: [
    {
      speaker_label: 'SPEAKER_1',
      matched_voice_id: 'voice-1',
      score: 0.9,
      segments: [{ start: 0, end: 1 }],
    },
  ],
};

export function createSessionsPrismaMock() {
  return {
    identify_sessions: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    voice_records: {
      findFirst: jest.fn(),
    },
    ai_identities_cache: {
      findUnique: jest.fn(),
    },
  };
}
