import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { ConfigModule } from '@nestjs/config';

import storageConfig from '@/config/storage.config';
import { LocalStorageDriver } from './drivers/local-storage.driver';
import { STORAGE_DRIVER_TOKEN } from './interfaces/storage-driver.interface';
import { StorageService } from './service/storage.service';

@Module({
  imports: [ConfigModule],
  providers: [
    LocalStorageDriver,
    {
      provide: STORAGE_DRIVER_TOKEN,
      inject: [storageConfig.KEY, LocalStorageDriver],
      useFactory: (
        cfg: ConfigType<typeof storageConfig>,
        local: LocalStorageDriver,
      ) => {
        return local;
      },
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
