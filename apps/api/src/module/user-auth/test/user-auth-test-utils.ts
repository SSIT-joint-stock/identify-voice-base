import { Role, UserStatus } from '@prisma/client';

export const account = {
  id: 'account-1',
  email: 'operator@example.com',
  username: 'operator',
  password: 'hash',
  role: Role.OPERATOR,
  status: UserStatus.ACTIVE,
  permissions: ['translate.run'],
  refresh_token: null,
};

export function createUsersRepositoryMock() {
  return {
    findById: jest.fn(),
    findByIdOrThrow: jest.fn(),
    findByEmail: jest.fn(),
    findByUsername: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    serializeAccount: jest.fn((item) => ({
      id: item.id,
      email: item.email,
      username: item.username,
      role: item.role,
      status: item.status,
      permissions: item.permissions ?? [],
    })),
  };
}

export function createUserAuthPrismaMock() {
  return {
    auth_accounts: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
  };
}
