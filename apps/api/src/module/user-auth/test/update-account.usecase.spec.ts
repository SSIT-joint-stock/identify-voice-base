import { BadRequestError } from '@/common/response';
import { UpdateAccountUseCase } from '../use-cases/update-account.usecase';
import { account, createUsersRepositoryMock } from './user-auth-test-utils';

describe(UpdateAccountUseCase.name, () => {
  it('updates current account when email and username are unique', async () => {
    const repository = createUsersRepositoryMock();
    repository.findByIdOrThrow.mockResolvedValue(account);
    repository.findByEmail.mockResolvedValue(null);
    repository.findByUsername.mockResolvedValue(null);
    repository.update.mockResolvedValue({
      ...account,
      email: 'new@example.com',
    });

    await expect(
      new UpdateAccountUseCase(repository as never).execute({
        userId: account.id,
        dto: { email: 'new@example.com', username: 'new-user' },
      }),
    ).resolves.toMatchObject({ email: 'new@example.com' });
  });

  it('rejects duplicate email or username', async () => {
    const repository = createUsersRepositoryMock();
    repository.findByIdOrThrow.mockResolvedValue(account);
    repository.findByEmail.mockResolvedValueOnce({ id: 'other' });

    await expect(
      new UpdateAccountUseCase(repository as never).execute({
        userId: account.id,
        dto: { email: 'used@example.com' },
      }),
    ).rejects.toBeInstanceOf(BadRequestError);

    repository.findByEmail.mockResolvedValueOnce(null);
    repository.findByUsername.mockResolvedValueOnce({ id: 'other' });
    await expect(
      new UpdateAccountUseCase(repository as never).execute({
        userId: account.id,
        dto: { username: 'used-user' },
      }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});
