import { NotFoundError } from '@/common/response';
import { Role, UserStatus } from '@prisma/client';
import { UsersRepository } from '../repository/users.repository';
import { account, createUserAuthPrismaMock } from './user-auth-test-utils';

describe(UsersRepository.name, () => {
  let prisma: ReturnType<typeof createUserAuthPrismaMock>;
  let repository: UsersRepository;

  beforeEach(() => {
    prisma = createUserAuthPrismaMock();
    repository = new UsersRepository(prisma as never);
  });

  it('finds accounts by id, email, and username', async () => {
    prisma.auth_accounts.findUnique.mockResolvedValue(account);

    await expect(repository.findById(account.id)).resolves.toBe(account);
    await expect(repository.findByEmail(account.email)).resolves.toBe(account);
    await expect(repository.findByUsername(account.username)).resolves.toBe(
      account,
    );
  });

  it('throws when account id is missing', async () => {
    prisma.auth_accounts.findUnique.mockResolvedValue(null);

    await expect(repository.findByIdOrThrow('missing')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('finds paginated accounts with filters and serializes permissions', async () => {
    prisma.auth_accounts.findMany.mockResolvedValue([account]);
    prisma.auth_accounts.count.mockResolvedValue(1);

    const result = await repository.findAll({
      page: 2,
      page_size: 5,
      search: 'operator',
      role: Role.OPERATOR,
      status: UserStatus.ACTIVE,
      sort_by: 'email',
      sort_order: 'desc',
    });

    expect(prisma.auth_accounts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 5 }),
    );
    expect(result.pagination).toEqual({
      page: 2,
      page_size: 5,
      total: 1,
      total_pages: 1,
    });
    expect(repository.serializeAccount(account)).toMatchObject({
      id: account.id,
      permissions: expect.any(Array),
    });
  });
});
