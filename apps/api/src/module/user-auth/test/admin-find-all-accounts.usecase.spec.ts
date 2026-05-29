import { AdminFindAllAccountsUseCase } from '../use-cases/admin-find-all-accounts.usecase';
import { account, createUsersRepositoryMock } from './user-auth-test-utils';

describe(AdminFindAllAccountsUseCase.name, () => {
  it('serializes paginated account list', async () => {
    const repository = createUsersRepositoryMock();
    repository.findAll.mockResolvedValue({
      items: [account],
      pagination: { page: 1 },
    });

    await expect(
      new AdminFindAllAccountsUseCase(repository as never).execute({ page: 1 }),
    ).resolves.toMatchObject({
      items: [expect.objectContaining({ id: account.id })],
      pagination: { page: 1 },
    });
  });
});
