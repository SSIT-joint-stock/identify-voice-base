import { NotFoundException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { DeleteAccountUseCase } from '../use-cases/delete-account.usecase';
import { account, createUserAuthPrismaMock } from './user-auth-test-utils';

describe(DeleteAccountUseCase.name, () => {
  it('soft deletes account', async () => {
    const prisma = createUserAuthPrismaMock();
    prisma.auth_accounts.findUnique.mockResolvedValue(account);

    await expect(
      new DeleteAccountUseCase(prisma as never).execute(account.id),
    ).resolves.toEqual({ message: 'Xóa tài khoản thành công' });
    expect(prisma.auth_accounts.update).toHaveBeenCalledWith({
      where: { id: account.id },
      data: { status: UserStatus.INACTIVE, refresh_token: null },
    });
  });

  it('throws when account is missing', async () => {
    const prisma = createUserAuthPrismaMock();
    prisma.auth_accounts.findUnique.mockResolvedValue(null);

    await expect(
      new DeleteAccountUseCase(prisma as never).execute(account.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
