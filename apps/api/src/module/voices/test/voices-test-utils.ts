import { UserGender, UserSource } from '@prisma/client';

export const voiceRecord = {
  id: 'voice-record-1',
  user_id: 'user-1',
  voice_id: 'voice-1',
  audio_file_id: 'audio-1',
  is_active: true,
  created_at: new Date('2026-01-01'),
  user_name: 'Nguyen Van A',
  user_email: null,
  user: {
    id: 'user-1',
    name: 'Nguyen Van A',
    citizen_identification: '0123',
    phone_number: '0900',
    hometown: 'HN',
    job: 'Engineer',
    passport: 'P1',
    criminal_record: [],
    age: 30,
    gender: UserGender.MALE,
    source: UserSource.SYSTEM,
    audio_url: 'http://cdn.local/enroll.wav',
  },
  audio_file: {
    id: 'audio-1',
    file_path: 'voices/audio.wav',
    file_name: 'audio.wav',
    mime_type: 'audio/wav',
  },
};

export function createVoicesPrismaMock() {
  return {
    voice_records: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    users: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    identify_sessions: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    update_voice_jobs: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };
}

export const searchUtil = {
  parseSearchAge: jest.fn((value?: string) => {
    const parsed = value ? Number(value) : Number.NaN;
    return Number.isInteger(parsed) ? parsed : null;
  }),
};
