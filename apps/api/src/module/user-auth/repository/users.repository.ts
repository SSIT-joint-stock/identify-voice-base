import { resolveAccountPermissions } from '@/common/auth/permissions';
import { NotFoundError } from '@/common/response';
import { PrismaService } from '@/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma, type auth_accounts } from '@prisma/client';
import { AdminGetAccountsFilterDto } from '../dto/admin-get-accounts-filter.dto';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.auth_accounts.findUnique({
      where: { id },
    });
  }

  async findByIdOrThrow(id: string) {
    const account = await this.findById(id);

    if (!account) {
      throw new NotFoundError('Không tìm thấy tài khoản');
    }

    return account;
  }

  async findByEmail(email: string) {
    return this.prisma.auth_accounts.findUnique({
      where: { email },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.auth_accounts.findUnique({
      where: { username },
    });
  }

  async findAll(filter: AdminGetAccountsFilterDto) {
    const {
      page = 1,
      page_size = 10,
      search,
      role,
      status,
      sort_by = 'email',
      sort_order = 'asc',
    } = filter;

    const where: Prisma.auth_accountsWhereInput = {
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(role && { role }),
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.auth_accounts.findMany({
        where,
        orderBy: { [sort_by]: sort_order },
        skip: (page - 1) * page_size,
        take: page_size,
      }),
      this.prisma.auth_accounts.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        page_size,
        total,
        total_pages: Math.ceil(total / page_size),
      },
    };
  }

  async create(data: Prisma.auth_accountsCreateInput) {
    return this.prisma.auth_accounts.create({ data });
  }

  async update(id: string, data: Prisma.auth_accountsUpdateInput) {
    return this.prisma.auth_accounts.update({
      where: { id },
      data,
    });
  }

  serializeAccount(
    account: Pick<
      auth_accounts,
      'id' | 'email' | 'username' | 'role' | 'status' | 'permissions'
    >,
  ) {
    return {
      id: account.id,
      email: account.email,
      username: account.username,
      role: account.role,
      status: account.status,
      permissions: resolveAccountPermissions(account),
    };
  }
}
