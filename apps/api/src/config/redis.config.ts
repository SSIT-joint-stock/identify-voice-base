import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => {
  let url = process.env.REDIS_URL;
  const host = process.env.REDIS_HOST || 'localhost';
  const port = process.env.REDIS_PORT || '6380';
  const password = process.env.REDIS_PASSWORD || '';

  if (url) {
    if (url.includes('${')) {
      url = url
        .replace(/\${REDIS_HOST}/g, host)
        .replace(/\${REDIS_PORT}/g, port)
        .replace(/\${REDIS_PASSWORD}/g, password);
    }

    // Safety check for literal 'PASSWORD' placeholder
    if (password && url.includes(':PASSWORD@')) {
      url = url.replace(':PASSWORD@', `:${password}@`);
    }
  }

  return {
    url: url || undefined,
    host,
    port: parseInt(port, 10),
    username: password ? 'default' : undefined,
    password: password || undefined,
    family: 0, // Support IPv6 for Railway internal network
  };
});
