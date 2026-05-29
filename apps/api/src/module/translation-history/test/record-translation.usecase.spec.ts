import { TranslationMode } from '@prisma/client';
import { RecordTranslationUseCase } from '../use-cases/record-translation.usecase';

describe(RecordTranslationUseCase.name, () => {
  it('trims text and records translation metadata', async () => {
    const repository = { create: jest.fn().mockResolvedValue('created') };

    await expect(
      new RecordTranslationUseCase(repository as never).execute({
        userId: 'user-1',
        sourceText: ' Xin chào ',
        translatedText: ' Hello ',
        sourceLang: ' vi ',
        targetLang: 'en',
        sourceFileType: ' text ',
        mode: 'summarize',
      }),
    ).resolves.toBe('created');
    expect(repository.create).toHaveBeenCalledWith({
      user_id: 'user-1',
      source_text: 'Xin chào',
      translated_text: 'Hello',
      source_lang: 'vi',
      target_lang: 'en',
      source_file_type: 'text',
      mode: TranslationMode.SUMMARIZE,
    });
  });

  it('skips empty source or translated text', async () => {
    const repository = { create: jest.fn() };

    await expect(
      new RecordTranslationUseCase(repository as never).execute({
        userId: 'user-1',
        sourceText: ' ',
        translatedText: 'Hello',
        mode: 'translate',
      }),
    ).resolves.toBeNull();
    expect(repository.create).not.toHaveBeenCalled();
  });
});
