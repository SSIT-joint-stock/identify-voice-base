import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  url: process.env.AI_SERVICE_URL || 'http://localhost:5000',
  apiKey: process.env.AI_SERVICE_KEY,
  timeout: parseInt(process.env.AI_SERVICE_TIMEOUT || '30000', 10),
}));
