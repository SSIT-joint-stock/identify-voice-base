import { ProcessBatchFileItemUseCase } from '../use-cases/process-batch-file-item.usecase';

describe('ProcessBatchFileItemUseCase', () => {
  const repository = {
    patchItem: jest.fn(),
  };
  const speechToTextUseCase = {
    execute: jest.fn(),
  };
  const ocrUseCase = {
    execute: jest.fn(),
  };
  const extractionJobService = {
    createOcrJob: jest.fn(),
    getJob: jest.fn(),
  };
  const translateUseCase = {
    executeWithProgress: jest.fn(),
  };
  const translationHistoryService = {
    recordTranslation: jest.fn(),
  };
  const refreshSummaryUseCase = {
    execute: jest.fn(),
  };

  const buildUseCase = () =>
    new ProcessBatchFileItemUseCase(
      repository as never,
      speechToTextUseCase as never,
      ocrUseCase as never,
      extractionJobService as never,
      translateUseCase as never,
      translationHistoryService as never,
      refreshSummaryUseCase as never,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    translateUseCase.executeWithProgress.mockImplementation(
      (_dto, onProgress) => {
        onProgress(50, 'Hello');
        onProgress(100, 'Hello world');
        return Promise.resolve({ translated_text: 'Hello world' });
      },
    );
    translationHistoryService.recordTranslation.mockResolvedValue({
      id: 'history-1',
    });
  });

  it('extracts audio with speech-to-text before translation', async () => {
    speechToTextUseCase.execute.mockResolvedValue({ transcript: 'Xin chao' });

    await buildUseCase().execute({
      batchId: 'batch-1',
      itemId: 'item-1',
      file: {
        originalname: 'call.mp3',
        mimetype: 'audio/mpeg',
      } as Express.Multer.File,
      dto: { source_lang: 'vi', target_lang: 'en' },
      userId: 'user-1',
    });

    expect(speechToTextUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ originalname: 'call.mp3' }),
      {
        language: 'vi',
        return_timestamp: false,
        denoise_audio: false,
      },
    );
    expect(ocrUseCase.execute).not.toHaveBeenCalled();
    expect(translateUseCase.executeWithProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        source_text: 'Xin chao',
        source_file_type: 'audio',
      }),
      expect.any(Function),
    );
    expect(repository.patchItem).toHaveBeenLastCalledWith('batch-1', 'item-1', {
      status: 'completed',
      progress: 100,
      translated_text: 'Hello world',
      source_file_type: 'audio',
      history_record_id: 'history-1',
    });
  });

  it('extracts document text with OCR before translation', async () => {
    ocrUseCase.execute.mockResolvedValue({ results: 'Noi dung tai lieu' });

    await buildUseCase().execute({
      batchId: 'batch-1',
      itemId: 'item-2',
      file: {
        originalname: 'report.docx',
        mimetype:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      } as Express.Multer.File,
      dto: { source_lang: 'vi', target_lang: 'en' },
      userId: 'user-1',
    });

    expect(ocrUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ originalname: 'report.docx' }),
      {
        language: 'vi',
        format: true,
      },
    );
    expect(speechToTextUseCase.execute).not.toHaveBeenCalled();
    expect(translateUseCase.executeWithProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        source_text: 'Noi dung tai lieu',
        source_file_type: 'document',
      }),
      expect.any(Function),
    );
    expect(refreshSummaryUseCase.execute).toHaveBeenCalledWith('batch-1');
  });
});
