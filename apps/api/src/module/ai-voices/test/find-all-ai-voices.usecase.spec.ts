import { FindAllAiVoicesUseCase } from '../use-cases/find-all-ai-voices.usecase';

describe(FindAllAiVoicesUseCase.name, () => {
  it('delegates to repository', async () => {
    const repo = { findNonEnrolled: jest.fn().mockResolvedValue('result') };

    await expect(
      new FindAllAiVoicesUseCase(repo as never).execute({ page: 1 }),
    ).resolves.toBe('result');
    expect(repo.findNonEnrolled).toHaveBeenCalledWith({ page: 1 }, undefined);
  });
});
