import { BadRequestError } from '@/common/response';
import { Role, UserStatus } from '@prisma/client';
import { AdminCreateAccountUseCase } from '../use-cases/admin-create-account.usecase';
import { account, createUsersRepositoryMock } from './user-auth-test-utils';

describe(AdminCreateAccountUseCase.name, () => {
  it('creates operator account with hashed password and normalized permissions', async () => {
    const repository = createUsersRepositoryMock();
    const bcrypt = { hashPassword: jest.fn().mockResolvedValue('hashed') };
    repository.create.mockResolvedValue(account);

    await new AdminCreateAccountUseCase(
      repository as never,
      bcrypt as never,
    ).execute({
      email: account.email,
      username: account.username,
      password: 'password',
      role: Role.OPERATOR,
      status: UserStatus.ACTIVE,
      permissions: ['translate.run'],
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: account.email,
        password: 'hashed',
        role: Role.OPERATOR,
      }),
    );
  });

  it('rejects duplicate email or username', async () => {
    const repository = createUsersRepositoryMock();
    const bcrypt = { hashPassword: jest.fn() };

    repository.findByEmail.mockResolvedValueOnce(account);
    await expect(
      new AdminCreateAccountUseCase(
        repository as never,
        bcrypt as never,
      ).execute({
        email: account.email,
        username: 'new',
        password: 'password',
      }),
    ).rejects.toBeInstanceOf(BadRequestError);

    repository.findByEmail.mockResolvedValueOnce(null);
    repository.findByUsername.mockResolvedValueOnce(account);
    await expect(
      new AdminCreateAccountUseCase(
        repository as never,
        bcrypt as never,
      ).execute({
        email: 'new@example.com',
        username: account.username,
        password: 'password',
      }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});
