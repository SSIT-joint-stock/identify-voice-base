import { NotFoundException } from '@nestjs/common';
import { GetMeUseCase } from '../use-cases/get-me.usecase';
import { account, createUserAuthPrismaMock } from './user-auth-test-utils';

describe(GetMeUseCase.name, () => {
  it('returns account with resolved permissions', async () => {
    const prisma = createUserAuthPrismaMock();
    prisma.auth_accounts.findUnique.mockResolvedValue(account);

    await expect(
      new GetMeUseCase(prisma as never).execute(account.id),
    ).resolves.toMatchObject({
      id: account.id,
      permissions: expect.any(Array),
    });
  });

  it('throws when account is missing', async () => {
    const prisma = createUserAuthPrismaMock();
    prisma.auth_accounts.findUnique.mockResolvedValue(null);

    await expect(
      new GetMeUseCase(prisma as never).execute(account.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
