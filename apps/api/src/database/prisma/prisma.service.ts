import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { databaseConfig } from '@/config';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(
    @Inject(databaseConfig.KEY)
    private readonly dbCfg: ConfigType<typeof databaseConfig>,
  ) {
    const connectionString = dbCfg.url;

    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined in configuration');
    }

    const pool = new Pool({
      connectionString,
      max: 12,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected to database via PrismaPg adapter');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
