import { registerAs } from '@nestjs/config';

// register the rate limit config
export default registerAs('throttler', () => ({
  ttl: parseInt(process.env.RATE_LIMIT_TTL ?? '60', 10),
  limit: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
}));
