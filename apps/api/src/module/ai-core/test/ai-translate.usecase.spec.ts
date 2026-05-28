import { aiCoreConfig } from '@/config';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { of, throwError } from 'rxjs';
import { AiTranslateUseCase } from '../usecase/ai-translate.usecase';

const config = {
  translation: {
    url: 'http://translation-core',
    chunkWordLimit: 3,
    chunkCharacterLimit: 12,
  },
};

function createUseCase(post = jest.fn()) {
  const httpService = { post } as unknown as jest.Mocked<HttpService>;

  return {
    httpService,
    useCase: new AiTranslateUseCase(httpService, config as never),
  };
}

describe(AiTranslateUseCase.name, () => {
  let loggerErrorSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    loggerLogSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    consoleLogSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
    jest.clearAllMocks();
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
    loggerLogSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('calls AI Core once for short translation payload', async () => {
    const post = jest.fn().mockReturnValue(
      of({
        data: {
          translated_text: 'Hello',
          target_lang: 'en',
        },
      }),
    );
    const { useCase } = createUseCase(post);
    const onProgress = jest.fn();

    const result = await useCase.executeWithProgress(
      {
        source_text: 'Xin chào',
        target_lang: 'en',
        source_lang: 'vi',
      },
      onProgress,
    );

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('http://translation-core/translate', {
      source_lang: 'vi',
      source_text: 'Xin chào',
      target_lang: 'en',
    });
    expect(onProgress).toHaveBeenLastCalledWith(100, 'Hello', 1, 1);
    expect(result).toMatchObject({ translated_text: 'Hello' });
  });

  it('splits long payload, translates chunks sequentially, and reports ordered partial text', async () => {
    const post = jest
      .fn()
      .mockReturnValueOnce(of({ data: { translated_text: 'Chunk 1' } }))
      .mockReturnValueOnce(of({ data: { translated_text: 'Chunk 2' } }))
      .mockReturnValueOnce(of({ data: { translated_text: 'Chunk 3' } }));
    const { useCase } = createUseCase(post);
    const onProgress = jest.fn();

    const result = await useCase.executeWithProgress(
      {
        source_text: 'một hai ba bốn năm sáu bảy',
        target_lang: 'en',
      },
      onProgress,
    );

    expect(post).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenNthCalledWith(1, 33, 'Chunk 1', 1, 3);
    expect(onProgress).toHaveBeenNthCalledWith(
      2,
      67,
      'Chunk 1\n\nChunk 2',
      2,
      3,
    );
    expect(onProgress).toHaveBeenNthCalledWith(
      3,
      100,
      'Chunk 1\n\nChunk 2\n\nChunk 3',
      3,
      3,
    );
    expect(result).toMatchObject({
      original_text: 'một hai ba bốn năm sáu bảy',
      translated_text: 'Chunk 1\n\nChunk 2\n\nChunk 3',
      target_lang: 'en',
    });
  });

  it('detects language through AI Core', async () => {
    const post = jest
      .fn()
      .mockReturnValue(of({ data: { detected_languages: ['vi'] } }));
    const { useCase } = createUseCase(post);

    await expect(useCase.detectLanguage({ text: 'Xin chào' })).resolves.toEqual(
      {
        detected_languages: ['vi'],
      },
    );
    expect(post).toHaveBeenCalledWith(
      'http://translation-core/detect_language',
      { text: 'Xin chào' },
    );
  });

  it('maps upstream 400 to BadRequestException and other failures to InternalServerErrorException', async () => {
    const badRequest = new AxiosError('bad');
    badRequest.response = {
      status: 400,
      data: { detail: 'Bad payload' },
    } as never;
    let { useCase } = createUseCase(
      jest.fn().mockReturnValue(throwError(() => badRequest)),
    );

    await expect(
      useCase.execute({ source_text: 'Xin chào', target_lang: 'en' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const upstreamError = new AxiosError('failed');
    upstreamError.response = {
      status: 500,
      data: { message: 'Core failed' },
    } as never;
    ({ useCase } = createUseCase(
      jest.fn().mockReturnValue(throwError(() => upstreamError)),
    ));

    await expect(
      useCase.execute({ source_text: 'Xin chào', target_lang: 'en' }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});

describe('aiCoreConfig translation chunk defaults', () => {
  it('exposes word and character chunk limits', () => {
    const value = aiCoreConfig();

    expect(value.translation.chunkWordLimit).toBeGreaterThan(0);
    expect(value.translation.chunkCharacterLimit).toBeGreaterThan(0);
  });
});
