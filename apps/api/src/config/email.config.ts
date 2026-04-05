import { registerAs } from '@nestjs/config';

export default registerAs('email', () => {
  const smtpUser = process.env.SMTP_USER || '';
  const appName = process.env.APP_NAME || 'Ecommerce API';

  // Manual expansion for variables like ${VAR} which might not be expanded by Railway/dotenv
  let from = process.env.EMAIL_FROM || `"${appName}" <${smtpUser}>`;

  if (from.includes('${')) {
    from = from
      .replace(/\${APP_NAME}/g, appName)
      .replace(/\${SMTP_USER}/g, smtpUser);
  }

  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure:
      process.env.SMTP_SECURE === 'true' ||
      (process.env.SMTP_SECURE === undefined ? false : false),
    user: smtpUser,
    pass: process.env.SMTP_PASS || '',
    from,
    templatesPath:
      process.env.EMAIL_TEMPLATES_PATH || 'src/module/email/templates',
  };
});
