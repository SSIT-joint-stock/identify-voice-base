import { Role, UserStatus } from '@prisma/client';

export const account = {
  id: 'account-1',
  email: 'operator@example.com',
  username: 'operator',
  password: 'hash',
  role: Role.OPERATOR,
  status: UserStatus.ACTIVE,
  permissions: ['translate.run'],
  refresh_token: 'refresh-old',
};

export function createAuthPrismaMock() {
  return {
    auth_accounts: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
}
