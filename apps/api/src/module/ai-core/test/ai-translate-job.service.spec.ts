import { RedisService } from '@/database/redis/redis.service';
import { TranslationHistoryService } from '@/module/translation-history/service/translation-history.service';
import { Logger, NotFoundException } from '@nestjs/common';
import { AiTranslateJobService } from '../service/ai-translate-job.service';
import { AiTranslateUseCase } from '../usecase/ai-translate.usecase';

function createRedisMock() {
  const store = new Map<string, string>();

  return {
    store,
    service: {
      get: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
      set: jest.fn((key: string, value: string) => {
        store.set(key, value);
        return Promise.resolve();
      }),
    } as unknown as jest.Mocked<RedisService>,
  };
}

async function flushAsyncWork() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

describe(AiTranslateJobService.name, () => {
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  it('creates a translate job, stores partial progress, records history, and completes', async () => {
    const { service: redis } = createRedisMock();
    const translateUseCase = {
      executeWithProgress: jest.fn((_dto, onProgress) => {
        onProgress(50, 'Partial translation', 1, 2);
        return Promise.resolve({
          translated_text: 'Final translation',
          target_lang: 'en',
        });
      }),
    };
    const historyService = {
      recordTranslation: jest.fn().mockResolvedValue({ id: 'history-1' }),
    };
    const service = new AiTranslateJobService(
      redis,
      translateUseCase as unknown as AiTranslateUseCase,
      historyService as unknown as TranslationHistoryService,
    );

    const created = await service.createJob(
      'translate',
      {
        source_text: 'Xin chào',
        target_lang: 'en',
        source_file_type: 'text',
      },
      'user-1',
    );
    await flushAsyncWork();

    const job = await service.getJob(created.job_id);
    expect(job).toMatchObject({
      status: 'completed',
      progress: 100,
      result: {
        translated_text: 'Final translation',
        history_record_id: 'history-1',
      },
    });
    expect(historyService.recordTranslation).toHaveBeenCalledWith({
      userId: 'user-1',
      sourceText: 'Xin chào',
      translatedText: 'Final translation',
      sourceLang: undefined,
      targetLang: 'en',
      sourceFileType: 'text',
      mode: 'translate',
    });
  });

  it('marks job failed when translate use case throws', async () => {
    const { service: redis } = createRedisMock();
    const service = new AiTranslateJobService(
      redis,
      {
        executeWithProgress: jest.fn().mockRejectedValue(new Error('boom')),
      } as unknown as AiTranslateUseCase,
      { recordTranslation: jest.fn() } as unknown as TranslationHistoryService,
    );

    const created = await service.createJob(
      'translate',
      { source_text: 'Xin chào', target_lang: 'en' },
      'user-1',
    );
    await flushAsyncWork();

    await expect(service.getJob(created.job_id)).resolves.toMatchObject({
      status: 'failed',
      error: 'boom',
    });
  });

  it('uses summarize runner for summarize jobs and skips history when user is missing', async () => {
    const { service: redis } = createRedisMock();
    const translateUseCase = {
      translateSummarizeWithProgress: jest.fn().mockResolvedValue({
        translated_text: 'Summary',
        target_lang: 'vi',
      }),
    };
    const historyService = { recordTranslation: jest.fn() };
    const service = new AiTranslateJobService(
      redis,
      translateUseCase as unknown as AiTranslateUseCase,
      historyService as unknown as TranslationHistoryService,
    );

    const created = await service.createJob('summarize', {
      source_text: 'Long text',
      target_lang: 'vi',
    });
    await flushAsyncWork();

    expect(translateUseCase.translateSummarizeWithProgress).toHaveBeenCalled();
    expect(historyService.recordTranslation).not.toHaveBeenCalled();
    await expect(service.getJob(created.job_id)).resolves.toMatchObject({
      status: 'completed',
      result: { translated_text: 'Summary' },
    });
  });

  it('throws when job is missing or expired', async () => {
    const { service: redis } = createRedisMock();
    const service = new AiTranslateJobService(
      redis,
      {} as AiTranslateUseCase,
      {} as TranslationHistoryService,
    );

    await expect(service.getJob('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
