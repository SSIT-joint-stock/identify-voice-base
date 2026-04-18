import { resolveAccountPermissions } from '@/common/auth/permissions';
import { NotFoundError } from '@/common/response';
import { PrismaService } from '@/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma, type auth_accounts } from '@prisma/client';

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

  async findAll() {
    return this.prisma.auth_accounts.findMany({
      orderBy: { email: 'asc' },
    });
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
