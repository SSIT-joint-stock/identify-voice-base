import { BadRequestError } from '@/common/response';
import { Role } from '@prisma/client';
import { AdminUpdateAccountUseCase } from '../use-cases/admin-update-account.usecase';
import { account, createUsersRepositoryMock } from './user-auth-test-utils';

describe(AdminUpdateAccountUseCase.name, () => {
  it('updates account and clears refresh token when password changes', async () => {
    const repository = createUsersRepositoryMock();
    const bcrypt = { hashPassword: jest.fn().mockResolvedValue('hashed') };
    repository.findByIdOrThrow.mockResolvedValue(account);
    repository.update.mockResolvedValue({ ...account, role: Role.ADMIN });

    await new AdminUpdateAccountUseCase(
      repository as never,
      bcrypt as never,
    ).execute({
      id: account.id,
      dto: { role: Role.ADMIN, password: 'new-password' },
    });

    expect(repository.update).toHaveBeenCalledWith(
      account.id,
      expect.objectContaining({
        role: Role.ADMIN,
        password: 'hashed',
        refresh_token: null,
      }),
    );
  });

  it('rejects duplicate email from another account', async () => {
    const repository = createUsersRepositoryMock();
    repository.findByIdOrThrow.mockResolvedValue(account);
    repository.findByEmail.mockResolvedValue({ ...account, id: 'other' });

    await expect(
      new AdminUpdateAccountUseCase(
        repository as never,
        { hashPassword: jest.fn() } as never,
      ).execute({
        id: account.id,
        dto: { email: 'used@example.com' },
      }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});
