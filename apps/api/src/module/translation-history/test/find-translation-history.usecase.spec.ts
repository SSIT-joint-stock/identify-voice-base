import { FindTranslationHistoryUseCase } from '../use-cases/find-translation-history.usecase';
import { translationRecord } from './translation-history-test-utils';

describe(FindTranslationHistoryUseCase.name, () => {
  it('maps effective translated text and passes through stats and pagination', async () => {
    const repository = {
      findAll: jest.fn().mockResolvedValue({
        items: [{ ...translationRecord, edited_translated_text: 'Edited' }],
        stats: { total: 1 },
        pagination: { page: 1 },
      }),
    };

    const result = await new FindTranslationHistoryUseCase(
      repository as never,
    ).execute({ page: 1 });

    expect(result).toMatchObject({
      items: [
        {
          id: 'history-1',
          effective_translated_text: 'Edited',
        },
      ],
      stats: { total: 1 },
      pagination: { page: 1 },
    });
  });
});
