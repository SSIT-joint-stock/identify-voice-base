import { registerAs } from '@nestjs/config';

const isProd = process.env.NODE_ENV === 'production';

export default registerAs('cookie', () => {
  const domain = isProd ? process.env.COOKIE_DOMAIN : 'localhost';

  return {
    domain: domain && domain !== 'localhost' ? domain : undefined,
    sameSite: (isProd ? 'none' : 'lax') as 'lax' | 'strict' | 'none',
    secure: isProd ? true : process.env.COOKIE_SECURE === 'true',
    httpOnly: process.env.COOKIE_HTTP_ONLY === 'true',
    maxAge: parseInt(process.env.COOKIE_MAX_AGE || '604800000', 10),
    path: process.env.COOKIE_PATH || '/',
  };
});
