import { CreateBatchFileUseCase } from '../use-cases/create-batch-file.usecase';

describe('CreateBatchFileUseCase', () => {
  const repository = {
    save: jest.fn(),
  };
  const storageRepository = {
    saveUploadedFile: jest.fn(),
  };
  const queueRepository = {
    enqueueProcess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    storageRepository.saveUploadedFile.mockImplementation(
      (_batchId: string, itemId: string) =>
        Promise.resolve({ storageKey: `batch-file/batch-1/${itemId}.bin` }),
    );
  });

  it('creates a batch state, stores original files, and enqueues background processing', async () => {
    const useCase = new CreateBatchFileUseCase(
      repository as never,
      storageRepository as never,
      queueRepository as never,
    );
    const files = [
      {
        originalname: 'call.mp3',
        mimetype: 'audio/mpeg',
      },
      {
        originalname: 'report.pdf',
        mimetype: 'application/pdf',
      },
    ] as Express.Multer.File[];

    const result = await useCase.execute({
      files,
      dto: { source_lang: 'vi', target_lang: 'en' },
      userId: 'user-1',
    });

    expect(result.batch_id).toEqual(expect.any(String));
    expect(storageRepository.saveUploadedFile).toHaveBeenCalledTimes(2);
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        batch_id: result.batch_id,
        status: 'pending',
        total_items: 2,
        items: [
          expect.objectContaining({
            filename: 'call.mp3',
            storage_key: expect.stringContaining('batch-file/batch-1/'),
            source_file_type: 'audio',
          }),
          expect.objectContaining({
            filename: 'report.pdf',
            storage_key: expect.stringContaining('batch-file/batch-1/'),
            source_file_type: 'document',
          }),
        ],
      }),
    );
    expect(queueRepository.enqueueProcess).toHaveBeenCalledWith({
      batchId: result.batch_id,
      dto: { source_lang: 'vi', target_lang: 'en' },
      userId: 'user-1',
    });
  });

  it('stores per-file options from file_options payload', async () => {
    const useCase = new CreateBatchFileUseCase(
      repository as never,
      storageRepository as never,
      queueRepository as never,
    );
    const files = [
      {
        originalname: 'call.mp3',
        mimetype: 'audio/mpeg',
      },
      {
        originalname: 'report.pdf',
        mimetype: 'application/pdf',
      },
    ] as Express.Multer.File[];

    await useCase.execute({
      files,
      dto: {
        target_lang: 'en',
        file_options: JSON.stringify([
          {
            source_lang: 'vi',
            target_lang: 'en',
            return_timestamp: true,
            denoise_audio: true,
          },
          {
            source_lang: 'en',
            target_lang: 'vi',
          },
        ]),
      },
      userId: 'user-1',
    });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            filename: 'call.mp3',
            source_lang: 'vi',
            target_lang: 'en',
            return_timestamp: true,
            denoise_audio: true,
          }),
          expect.objectContaining({
            filename: 'report.pdf',
            source_lang: 'en',
            target_lang: 'vi',
          }),
        ],
      }),
    );
  });
});
