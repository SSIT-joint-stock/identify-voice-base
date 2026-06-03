import { TranslationHistoryService } from '@/module/translation-history/service/translation-history.service';
import { AiCoreService } from '../service/ai-core.service';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'uuid-1'),
}));

describe(AiCoreService.name, () => {
  const uploadVoiceUseCase = { execute: jest.fn() };
  const identifySingleUseCase = { execute: jest.fn() };
  const identifyMultiUseCase = { execute: jest.fn() };
  const deleteVoiceUseCase = { execute: jest.fn() };
  const ocrUseCase = { execute: jest.fn() };
  const speechToTextUseCase = { execute: jest.fn() };
  const filterNoiseUseCase = { execute: jest.fn() };
  const translateUseCase = {
    execute: jest.fn(),
    detectLanguage: jest.fn(),
    translateSummarize: jest.fn(),
  };
  const translationHistoryService = {
    recordTranslation: jest.fn(),
  };

  function createService() {
    return new AiCoreService(
      uploadVoiceUseCase as never,
      identifySingleUseCase as never,
      identifyMultiUseCase as never,
      deleteVoiceUseCase as never,
      ocrUseCase as never,
      speechToTextUseCase as never,
      filterNoiseUseCase as never,
      translateUseCase as never,
      translationHistoryService as unknown as TranslationHistoryService,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates basic AI operations to their use cases', async () => {
    uploadVoiceUseCase.execute.mockResolvedValue('upload');
    identifySingleUseCase.execute.mockResolvedValue('single');
    identifyMultiUseCase.execute.mockResolvedValue('multi');
    deleteVoiceUseCase.execute.mockResolvedValue('delete');
    ocrUseCase.execute.mockResolvedValue('ocr');
    speechToTextUseCase.execute.mockResolvedValue('s2t');
    filterNoiseUseCase.execute.mockResolvedValue('filter');
    const service = createService();

    await expect(
      service.uploadVoice('/tmp/a.wav', 'name', 'audio/wav'),
    ).resolves.toBe('upload');
    await expect(
      service.identifySingle('/tmp/a.wav', 'audio/wav'),
    ).resolves.toBe('single');
    await expect(
      service.identifyMulti('/tmp/a.wav', 'audio/wav'),
    ).resolves.toBe('multi');
    await expect(service.deleteVoice('voice-1')).resolves.toBe('delete');
    await expect(service.ocr({} as never, {})).resolves.toBe('ocr');
    await expect(service.speechToText({} as never, {})).resolves.toBe('s2t');
    await expect(service.filterNoise({} as never)).resolves.toBe('filter');
  });

  it('records translate history and attaches history id when user is present', async () => {
    translateUseCase.execute.mockResolvedValue({
      translated_text: 'Hello',
      target_lang: 'en',
    });
    translationHistoryService.recordTranslation.mockResolvedValue({
      id: 'history-1',
    });
    const service = createService();

    const result = await service.translate(
      {
        source_text: 'Xin chào',
        target_lang: 'en',
        source_lang: 'vi',
        source_file_type: 'text',
      },
      'user-1',
    );

    expect(translationHistoryService.recordTranslation).toHaveBeenCalledWith({
      userId: 'user-1',
      sourceText: 'Xin chào',
      translatedText: 'Hello',
      sourceLang: 'vi',
      targetLang: 'en',
      sourceFileType: 'text',
      mode: 'translate',
    });
    expect(result).toMatchObject({
      translated_text: 'Hello',
      history_record_id: 'history-1',
    });
  });

  it('does not record translate history without user or translated text', async () => {
    translateUseCase.execute.mockResolvedValue({ target_lang: 'en' });
    const service = createService();

    await expect(
      service.translate({ source_text: 'Xin chào', target_lang: 'en' }),
    ).resolves.toEqual({ target_lang: 'en' });
    expect(translationHistoryService.recordTranslation).not.toHaveBeenCalled();
  });

  it('records summarize history with summarize mode', async () => {
    translateUseCase.translateSummarize.mockResolvedValue({
      translated_text: 'Summary',
      target_lang: 'vi',
    });
    translationHistoryService.recordTranslation.mockResolvedValue({
      id: 'history-2',
    });
    const service = createService();

    await expect(
      service.translateSummarize(
        { source_text: 'Long text', target_lang: 'vi' },
        'user-1',
      ),
    ).resolves.toMatchObject({ history_record_id: 'history-2' });
    expect(translationHistoryService.recordTranslation).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'summarize' }),
    );
  });

  it('delegates language detection', async () => {
    translateUseCase.detectLanguage.mockResolvedValue({
      detected_languages: 'en',
      scores: 0.30764684081077576,
    });

    await expect(
      createService().detectLanguage({ text: 'Xin chào' }),
    ).resolves.toEqual({
      detected_languages: 'en',
      scores: 0.30764684081077576,
    });
  });
});
