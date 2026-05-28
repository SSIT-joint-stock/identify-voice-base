import { NotFoundException } from '@nestjs/common';
import { UpdateUserInfoUseCase } from '../use-cases/update-info.usecase';
import { account, createAuthPrismaMock } from './auth-test-utils';

describe(UpdateUserInfoUseCase.name, () => {
  let prisma: ReturnType<typeof createAuthPrismaMock>;

  beforeEach(() => {
    prisma = createAuthPrismaMock();
  });

  it('updates email and username when unique', async () => {
    prisma.auth_accounts.findUnique
      .mockResolvedValueOnce(account)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.auth_accounts.update.mockResolvedValue({
      ...account,
      email: 'new@example.com',
      username: 'new-user',
    });

    const result = await new UpdateUserInfoUseCase(prisma as never).execute({
      userId: account.id,
      dto: { email: 'new@example.com', username: 'new-user' },
    });

    expect(result).toMatchObject({
      email: 'new@example.com',
      username: 'new-user',
    });
  });

  it('rejects missing account, duplicate email, and duplicate username', async () => {
    prisma.auth_accounts.findUnique.mockResolvedValueOnce(null);
    await expect(
      new UpdateUserInfoUseCase(prisma as never).execute({
        userId: account.id,
        dto: { email: 'new@example.com' },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.auth_accounts.findUnique
      .mockResolvedValueOnce(account)
      .mockResolvedValueOnce({ id: 'other' });
    await expect(
      new UpdateUserInfoUseCase(prisma as never).execute({
        userId: account.id,
        dto: { email: 'used@example.com' },
      }),
    ).rejects.toThrow('Email đã tồn tại');

    prisma.auth_accounts.findUnique
      .mockResolvedValueOnce(account)
      .mockResolvedValueOnce({ id: 'other' });
    await expect(
      new UpdateUserInfoUseCase(prisma as never).execute({
        userId: account.id,
        dto: { username: 'used-user' },
      }),
    ).rejects.toThrow('Tên đăng nhập đã tồn tại');
  });
});
