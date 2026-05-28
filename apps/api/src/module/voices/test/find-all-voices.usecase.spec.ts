import { FindAllVoicesUseCase } from '../use-cases/find-all-voices.usecase';

describe(FindAllVoicesUseCase.name, () => {
  it('delegates to repository', async () => {
    const repository = {
      findActiveVoices: jest.fn().mockResolvedValue('result'),
    };

    await expect(
      new FindAllVoicesUseCase(repository as never).execute({ page: 1 }),
    ).resolves.toBe('result');
  });
});
