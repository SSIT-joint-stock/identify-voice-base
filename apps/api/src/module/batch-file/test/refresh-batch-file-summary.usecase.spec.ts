import { RefreshBatchFileSummaryUseCase } from '../use-cases/refresh-batch-file-summary.usecase';

describe('RefreshBatchFileSummaryUseCase', () => {
  const repository = {
    findById: jest.fn(),
    patchBatch: jest.fn(),
  };
  const queueRepository = {
    enqueueCleanupStorage: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks a batch partial when some items completed and some failed', async () => {
    repository.findById.mockResolvedValue({
      batch_id: 'batch-1',
      total_items: 3,
      items: [
        { status: 'completed', progress: 100 },
        { status: 'failed', progress: 100 },
        { status: 'completed', progress: 100 },
      ],
    });

    await new RefreshBatchFileSummaryUseCase(
      repository as never,
      queueRepository as never,
    ).execute('batch-1');

    expect(repository.patchBatch).toHaveBeenCalledWith('batch-1', {
      status: 'partial',
      progress: 100,
      completed_items: 2,
      failed_items: 1,
    });
    expect(queueRepository.enqueueCleanupStorage).toHaveBeenCalledWith({
      batchId: 'batch-1',
    });
  });

  it('keeps a batch processing when at least one item is still active', async () => {
    repository.findById.mockResolvedValue({
      batch_id: 'batch-1',
      total_items: 2,
      items: [
        { status: 'completed', progress: 100 },
        { status: 'translating', progress: 45 },
      ],
    });

    await new RefreshBatchFileSummaryUseCase(
      repository as never,
      queueRepository as never,
    ).execute('batch-1');

    expect(repository.patchBatch).toHaveBeenCalledWith('batch-1', {
      status: 'processing',
      progress: 73,
      completed_items: 1,
      failed_items: 0,
    });
    expect(queueRepository.enqueueCleanupStorage).not.toHaveBeenCalled();
  });
});
