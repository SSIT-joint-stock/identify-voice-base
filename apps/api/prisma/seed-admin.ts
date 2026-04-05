import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';
import * as path from 'path';
import { Pool } from 'pg';

// Load and expand environment variables from project root
const myEnv = dotenv.config({
  path: path.join(__dirname, '../../../.env.development'),
});
dotenvExpand.expand(myEnv);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not defined in environment');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const args = process.argv.slice(2);
  const email = args[0];
  const password = args[1];

  if (!email || !password) {
    console.error(
      'Sử dụng: pnpm --filter api exec ts-node -r tsconfig-paths/register ./prisma/seed-admin.ts <email> <password>',
    );
    process.exit(1);
  }

  console.log(`Đang khởi tạo tài khoản admin: ${email}`);

  const hashedPassword = await bcrypt.hash(password, 10);

  // Khởi tạo hoặc cập nhật tài khoản auth_accounts
  await prisma.auth_accounts.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: Role.ADMIN,
    },
    create: {
      email,
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  console.log(`✅ Đã khởi tạo tài khoản admin thành công: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
