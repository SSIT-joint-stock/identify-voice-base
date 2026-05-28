import { LogoutUseCase } from '../use-cases/logout.usecase';
import { account, createAuthPrismaMock } from './auth-test-utils';

describe(LogoutUseCase.name, () => {
  it('clears stored refresh token', async () => {
    const prisma = createAuthPrismaMock();

    await new LogoutUseCase(prisma as never).execute(account.id);

    expect(prisma.auth_accounts.update).toHaveBeenCalledWith({
      where: { id: account.id },
      data: { refresh_token: null },
    });
  });
});
