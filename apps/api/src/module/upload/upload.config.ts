import { memoryStorage } from 'multer';

import storageConfig from '@/config/storage.config';
import type { ConfigType } from '@nestjs/config';

export const multerConfigFactory = (cfg: ConfigType<typeof storageConfig>) => {
  return {
    storage: memoryStorage(),
    limits: {
      fileSize: cfg.maxSize,
    },
  };
};
