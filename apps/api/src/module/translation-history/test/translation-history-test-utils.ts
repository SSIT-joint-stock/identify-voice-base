import { Role, TranslationMode } from '@prisma/client';

export const translationRecord = {
  id: 'history-1',
  user_id: 'user-1',
  source_text: 'Xin chào',
  translated_text: 'Hello',
  edited_translated_text: null,
  edited_at: null,
  edited_by: null,
  source_lang: 'vi',
  target_lang: 'en',
  source_file_type: 'text',
  mode: TranslationMode.TRANSLATE,
  created_at: new Date('2026-01-01'),
  operator: {
    id: 'user-1',
    email: 'operator@example.com',
    username: 'operator',
    role: Role.OPERATOR,
  },
};

export function createTranslationHistoryPrismaMock() {
  return {
    translation_records: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };
}
