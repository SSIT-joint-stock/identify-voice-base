import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';
import { expand } from 'dotenv-expand';
import * as path from 'path';

const nodeEnv = process.env.NODE_ENV || 'development';
const envCandidates = [
  path.resolve(__dirname, `.env.${nodeEnv}.local`),
  path.resolve(__dirname, `.env.${nodeEnv}`),
  path.resolve(__dirname, '.env.local'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, `../../.env.${nodeEnv}.local`),
  path.resolve(__dirname, `../../.env.${nodeEnv}`),
  path.resolve(__dirname, '../../.env.local'),
  path.resolve(__dirname, '../../.env'),
];

for (const envPath of envCandidates) {
  const loaded = dotenv.config({ path: envPath });
  if (!loaded.error) {
    expand(loaded);
    break;
  }
}

const databaseUrl =
  process.env.DATABASE_URL ||
  (process.env.DB_USER &&
  process.env.DB_PASSWORD &&
  process.env.DB_HOST &&
  process.env.DB_PORT &&
  process.env.DB_NAME
    ? `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?schema=${process.env.DB_SCHEMA || 'public'}`
    : undefined);

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
});
