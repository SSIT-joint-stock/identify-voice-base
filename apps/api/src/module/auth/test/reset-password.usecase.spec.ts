import { BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ResetPasswordUseCase } from '../use-cases/reset-password.usecase';
import { account, createAuthPrismaMock } from './auth-test-utils';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe(ResetPasswordUseCase.name, () => {
  let prisma: ReturnType<typeof createAuthPrismaMock>;

  beforeEach(() => {
    prisma = createAuthPrismaMock();
    jest.clearAllMocks();
  });

  it('updates password hash and clears refresh token', async () => {
    prisma.auth_accounts.findUnique.mockResolvedValue(account);
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
    jest.mocked(bcrypt.hash).mockResolvedValue('new-hash' as never);

    await new ResetPasswordUseCase(prisma as never).execute({
      userId: account.id,
      dto: { old_password: 'old', new_password: 'new' },
    });

    expect(prisma.auth_accounts.update).toHaveBeenCalledWith({
      where: { id: account.id },
      data: { password: 'new-hash', refresh_token: null },
    });
  });

  it('rejects missing account, wrong old password, and reused password', async () => {
    prisma.auth_accounts.findUnique.mockResolvedValueOnce(null);
    await expect(
      new ResetPasswordUseCase(prisma as never).execute({
        userId: account.id,
        dto: { old_password: 'old', new_password: 'new' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.auth_accounts.findUnique.mockResolvedValueOnce(account);
    jest.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);
    await expect(
      new ResetPasswordUseCase(prisma as never).execute({
        userId: account.id,
        dto: { old_password: 'old', new_password: 'new' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    prisma.auth_accounts.findUnique.mockResolvedValueOnce(account);
    jest.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    await expect(
      new ResetPasswordUseCase(prisma as never).execute({
        userId: account.id,
        dto: { old_password: 'same', new_password: 'same' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
