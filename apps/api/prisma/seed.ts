import * as dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import * as path from 'path';
import { PrismaClient, Role, UserStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';

// Load env from monorepo root first, then fallback local.
dotenvExpand.expand(
  dotenv.config({
    path: path.resolve(process.cwd(), '../../.env.development'),
  }),
);
dotenvExpand.expand(
  dotenv.config({ path: path.resolve(process.cwd(), '.env') }),
);

const databaseUrl =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?schema=${process.env.DB_SCHEMA || 'public'}`;

if (!databaseUrl) {
  throw new Error('Thiếu DATABASE_URL. Hãy kiểm tra file .env.development');
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const username = process.env.SEED_ADMIN_USERNAME ?? 'admin';
  const plainPassword = process.env.SEED_ADMIN_PASSWORD ?? '123456';
  const password = await bcrypt.hash(plainPassword, 10);

  const account = await prisma.auth_accounts.upsert({
    where: { email },
    update: {
      username,
      password,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      email,
      username,
      password,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  console.log('Seed thành công tài khoản đăng nhập:');
  console.log(`- email: ${account.email}`);
  console.log(`- password: ${plainPassword}`);
}

main()
  .catch((error) => {
    console.error('Seed thất bại:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
