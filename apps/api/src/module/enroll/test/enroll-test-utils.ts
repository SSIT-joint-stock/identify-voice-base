import { AudioPurpose, UserGender } from '@prisma/client';

export const enrollDto = {
  name: 'Nguyen Van A',
  citizen_identification: '0123456789',
  phone_number: '0900000000',
  hometown: 'HN',
  job: 'Engineer',
  passport: 'P123',
  criminal_record: JSON.stringify([{ case: 'none', year: 2024 }]),
  age: 30,
  gender: UserGender.MALE,
};

export const multerFile = {
  originalname: 'voice.wav',
  mimetype: 'audio/wav',
  size: 1024,
  buffer: Buffer.from('audio'),
} as Express.Multer.File;

export const uploadedAudioFile = {
  id: 'audio-1',
  file_path: 'voices/audio.wav',
  file_name: 'voice.wav',
  mime_type: 'audio/wav',
  size_bytes: 1024,
  duration_sec: 3,
  purpose: AudioPurpose.ENROLL,
  uploaded_by: 'operator-1',
};

export function createEnrollPrismaMock() {
  return {
    $transaction: jest.fn(),
  };
}
