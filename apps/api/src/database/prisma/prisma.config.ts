import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({
  path: path.join(__dirname, '..', '..', '..', '.env.development'),
});

export default defineConfig({
  schema: 'apps/api/prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
