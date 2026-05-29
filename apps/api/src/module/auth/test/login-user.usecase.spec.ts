import { UnauthorizedError } from '@/common/response';
import { UserStatus } from '@prisma/client';
import { LoginUserUseCase } from '../use-cases/login-user.usecase';
import { account, createAuthPrismaMock } from './auth-test-utils';

describe(LoginUserUseCase.name, () => {
  let prisma: ReturnType<typeof createAuthPrismaMock>;
  const tokenService = {
    generateTokenPair: jest.fn().mockReturnValue({
      access_token: 'access-new',
      refresh_token: 'refresh-new',
    }),
  };
  const bcryptService = {
    comparePassword: jest.fn(),
  };

  beforeEach(() => {
    prisma = createAuthPrismaMock();
    jest.clearAllMocks();
  });

  it('returns tokens and stores refresh token for active account', async () => {
    prisma.auth_accounts.findUnique.mockResolvedValue(account);
    bcryptService.comparePassword.mockResolvedValue(true);

    const result = await new LoginUserUseCase(
      prisma as never,
      tokenService as never,
      bcryptService as never,
    ).execute({
      email: account.email,
      password: 'password',
    });

    expect(tokenService.generateTokenPair).toHaveBeenCalledWith(
      expect.objectContaining({ id: account.id, email: account.email }),
    );
    expect(prisma.auth_accounts.update).toHaveBeenCalledWith({
      where: { id: account.id },
      data: { refresh_token: 'refresh-new' },
    });
    expect(result).toMatchObject({
      access_token: 'access-new',
      refresh_token: 'refresh-new',
      expires_in: 900,
      account: { id: account.id, email: account.email },
    });
  });

  it('rejects unknown account or invalid password', async () => {
    prisma.auth_accounts.findUnique.mockResolvedValue(null);

    await expect(
      new LoginUserUseCase(
        prisma as never,
        tokenService as never,
        bcryptService as never,
      ).execute({ email: account.email, password: 'bad' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects inactive account', async () => {
    prisma.auth_accounts.findUnique.mockResolvedValue({
      ...account,
      status: UserStatus.INACTIVE,
    });
    bcryptService.comparePassword.mockResolvedValue(true);

    await expect(
      new LoginUserUseCase(
        prisma as never,
        tokenService as never,
        bcryptService as never,
      ).execute({ email: account.email, password: 'password' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
