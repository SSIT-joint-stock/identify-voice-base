export const cacheRecord = {
  voice_id: 'voice-1',
  name: 'AI Person',
  citizen_identification: '0123456789',
  phone_number: '0900000000',
  hometown: 'HN',
  job: 'Engineer',
  passport: null,
  criminal_record: null,
  raw: {},
  first_seen_at: new Date('2026-01-01'),
};

export function createAiVoicesPrismaMock() {
  return {
    voice_records: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    ai_identities_cache: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    identify_sessions: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    users: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}
