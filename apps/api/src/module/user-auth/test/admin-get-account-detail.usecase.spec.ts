import { AdminGetAccountDetailUseCase } from '../use-cases/admin-get-account-detail.usecase';
import { account, createUsersRepositoryMock } from './user-auth-test-utils';

describe(AdminGetAccountDetailUseCase.name, () => {
  it('finds and serializes account detail', async () => {
    const repository = createUsersRepositoryMock();
    repository.findByIdOrThrow.mockResolvedValue(account);

    await expect(
      new AdminGetAccountDetailUseCase(repository as never).execute(account.id),
    ).resolves.toMatchObject({ id: account.id });
  });
});
