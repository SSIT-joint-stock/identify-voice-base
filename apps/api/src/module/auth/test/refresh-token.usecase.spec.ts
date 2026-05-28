import { UnauthorizedError } from '@/common/response';
import { UserStatus } from '@prisma/client';
import { RefreshTokenUseCase } from '../use-cases/refresh-token.usecase';
import { account, createAuthPrismaMock } from './auth-test-utils';

describe(RefreshTokenUseCase.name, () => {
  let prisma: ReturnType<typeof createAuthPrismaMock>;
  const tokenService = {
    verifyRefreshToken: jest.fn(),
    generateTokenPair: jest.fn().mockReturnValue({
      access_token: 'access-new',
      refresh_token: 'refresh-new',
    }),
  };

  beforeEach(() => {
    prisma = createAuthPrismaMock();
    jest.clearAllMocks();
  });

  it('rotates refresh token when current token is valid', async () => {
    tokenService.verifyRefreshToken.mockReturnValue({
      payload: { id: account.id },
    });
    prisma.auth_accounts.findUnique.mockResolvedValue(account);

    const result = await new RefreshTokenUseCase(
      prisma as never,
      tokenService as never,
    ).execute(account.refresh_token);

    expect(result).toEqual({
      access_token: 'access-new',
      refresh_token: 'refresh-new',
    });
    expect(prisma.auth_accounts.update).toHaveBeenCalledWith({
      where: { id: account.id },
      data: { refresh_token: 'refresh-new' },
    });
  });

  it('rejects missing token', async () => {
    await expect(
      new RefreshTokenUseCase(prisma as never, tokenService as never).execute(
        '',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects missing, inactive, or mismatched account', async () => {
    tokenService.verifyRefreshToken.mockReturnValue({
      payload: { id: account.id },
    });

    prisma.auth_accounts.findUnique.mockResolvedValueOnce(null);
    await expect(
      new RefreshTokenUseCase(prisma as never, tokenService as never).execute(
        account.refresh_token,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    prisma.auth_accounts.findUnique.mockResolvedValueOnce({
      ...account,
      status: UserStatus.INACTIVE,
    });
    await expect(
      new RefreshTokenUseCase(prisma as never, tokenService as never).execute(
        account.refresh_token,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    prisma.auth_accounts.findUnique.mockResolvedValueOnce(account);
    await expect(
      new RefreshTokenUseCase(prisma as never, tokenService as never).execute(
        'refresh-other',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
