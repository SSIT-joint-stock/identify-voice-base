import { TranslationHistoryRepository } from '../repository/translation-history.repository';
import {
  createTranslationHistoryPrismaMock,
  translationRecord,
} from './translation-history-test-utils';

describe(TranslationHistoryRepository.name, () => {
  let prisma: ReturnType<typeof createTranslationHistoryPrismaMock>;
  let repository: TranslationHistoryRepository;

  beforeEach(() => {
    prisma = createTranslationHistoryPrismaMock();
    repository = new TranslationHistoryRepository(prisma as never);
  });

  it('creates, finds, and updates translation records', async () => {
    prisma.translation_records.create.mockResolvedValue(translationRecord);
    prisma.translation_records.findUnique.mockResolvedValue(translationRecord);
    prisma.translation_records.update.mockResolvedValue({
      ...translationRecord,
      edited_translated_text: 'Edited',
    });

    await expect(repository.create({} as never)).resolves.toBe(
      translationRecord,
    );
    await expect(repository.findById('history-1')).resolves.toBe(
      translationRecord,
    );
    await expect(
      repository.updateEditedTranslation('history-1', 'Edited', 'user-1'),
    ).resolves.toMatchObject({ edited_translated_text: 'Edited' });
  });

  it('finds all records with stats and pagination', async () => {
    prisma.translation_records.findMany.mockResolvedValue([translationRecord]);
    prisma.translation_records.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    prisma.translation_records.groupBy
      .mockResolvedValueOnce([{ target_lang: 'en', _count: { _all: 1 } }])
      .mockResolvedValueOnce([{ mode: 'TRANSLATE', _count: { _all: 1 } }]);

    const result = await repository.findAll({
      page: 2,
      page_size: 10,
      from_date: '2026-01-01',
      to_date: '2026-01-02',
      target_lang: 'en',
    });

    expect(prisma.translation_records.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
    expect(result).toMatchObject({
      items: [translationRecord],
      stats: {
        total: 1,
        today_count: 1,
        by_target_lang: [{ target_lang: 'en', count: 1 }],
      },
      pagination: { page: 2, page_size: 10, total: 1, total_pages: 1 },
    });
  });
});
