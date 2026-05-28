import { AudioPurpose } from '@prisma/client';

export const identifyFile = {
  originalname: 'identify.wav',
  mimetype: 'audio/wav',
  size: 1024,
  buffer: Buffer.from('audio'),
} as Express.Multer.File;

export const identifyAudioFile = {
  id: 'audio-1',
  file_path: 'identify/audio.wav',
  file_name: 'identify.wav',
  mime_type: 'audio/wav',
  size_bytes: 1024,
  purpose: AudioPurpose.IDENTIFY,
  uploaded_by: 'operator-1',
};

export const aiSpeaker = {
  speaker_label: 'SPEAKER_1',
  matched_voice_id: 'voice-1',
  score: 0.91,
  name: 'AI Name',
  citizen_identification: '0123',
  phone_number: '0900',
  segments: [{ start: 0, end: 1 }],
  raw_ai_data: { id: 'raw' },
};

export function createIdentifyPrismaMock() {
  return {
    ai_identities_cache: {
      upsert: jest.fn(),
    },
    voice_records: {
      findFirst: jest.fn(),
    },
  };
}
