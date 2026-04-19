import { memoryStorage } from 'multer';
export const multerConfigFactory = () => {
  return {
    storage: memoryStorage(),
  };
};
