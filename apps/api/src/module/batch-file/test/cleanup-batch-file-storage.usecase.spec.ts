import { CleanupBatchFileStorageUseCase } from '../use-cases/cleanup-batch-file-storage.usecase';

describe('CleanupBatchFileStorageUseCase', () => {
  const repository = {
    findById: jest.fn(),
    save: jest.fn(),
  };
  const storageRepository = {
    deleteUploadedFile: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes uploaded files and clears storage keys from batch state', async () => {
    repository.findById.mockResolvedValue({
      batch_id: 'batch-1',
      status: 'completed',
      items: [
        {
          item_id: 'item-1',
          storage_key: 'batch-file/batch-1/item-1.mp3',
          updated_at: '2026-05-30T00:00:00.000Z',
        },
        {
          item_id: 'item-2',
          storage_key: 'batch-file/batch-1/item-2.pdf',
          updated_at: '2026-05-30T00:00:00.000Z',
        },
      ],
      updated_at: '2026-05-30T00:00:00.000Z',
    });

    await new CleanupBatchFileStorageUseCase(
      repository as never,
      storageRepository as never,
    ).execute('batch-1');

    expect(storageRepository.deleteUploadedFile).toHaveBeenCalledWith(
      'batch-file/batch-1/item-1.mp3',
    );
    expect(storageRepository.deleteUploadedFile).toHaveBeenCalledWith(
      'batch-file/batch-1/item-2.pdf',
    );
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.not.objectContaining({
            storage_key: expect.any(String),
          }),
          expect.not.objectContaining({
            storage_key: expect.any(String),
          }),
        ],
      }),
    );
  });
});
