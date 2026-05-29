import { TranslationHistoryService } from '../service/translation-history.service';

describe(TranslationHistoryService.name, () => {
  it('delegates record, findAll, and update to use cases', async () => {
    const recordUseCase = { execute: jest.fn().mockResolvedValue('record') };
    const findUseCase = { execute: jest.fn().mockResolvedValue('find') };
    const updateUseCase = { execute: jest.fn().mockResolvedValue('update') };
    const service = new TranslationHistoryService(
      recordUseCase as never,
      findUseCase as never,
      updateUseCase as never,
    );

    await expect(service.recordTranslation({} as never)).resolves.toBe(
      'record',
    );
    await expect(service.findAll({ page: 1 })).resolves.toBe('find');
    await expect(service.update({} as never)).resolves.toBe('update');
  });
});
