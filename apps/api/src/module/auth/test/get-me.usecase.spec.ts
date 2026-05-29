import { NotFoundException } from '@nestjs/common';
import { GetMeUseCase } from '../use-cases/get-me.usecase';
import { account, createAuthPrismaMock } from './auth-test-utils';

describe(GetMeUseCase.name, () => {
  let prisma: ReturnType<typeof createAuthPrismaMock>;

  beforeEach(() => {
    prisma = createAuthPrismaMock();
  });

  it('returns selected account profile', async () => {
    prisma.auth_accounts.findUnique.mockResolvedValue(account);

    await expect(
      new GetMeUseCase(prisma as never).execute(account.id),
    ).resolves.toBe(account);
  });

  it('throws when account does not exist', async () => {
    prisma.auth_accounts.findUnique.mockResolvedValue(null);

    await expect(
      new GetMeUseCase(prisma as never).execute(account.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
