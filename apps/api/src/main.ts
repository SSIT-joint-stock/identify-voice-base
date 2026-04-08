import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import 'reflect-metadata';

// Load environment variables and log which file was used
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
const possiblePaths = [
  path.join(process.cwd(), envFile), // root or apps/api
  path.join(process.cwd(), '.env'), // fallback to plain .env
  path.join(process.cwd(), '..', '..', envFile), // if running from apps/api/src (legacy support)
  path.join(process.cwd(), '..', '..', '.env'),
];

let loadedEnvPath = '(none found)';
for (const envPath of possiblePaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    loadedEnvPath = envPath;
    break;
  }
}

console.log(`📋 [ENV] Loaded environment from: ${loadedEnvPath}`);

// core
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
// app
import { AppModule } from '@/app.module';
import { appConfig } from '@/config';
// external
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// bootstrap the application
async function bootstrap() {
  // Ensure logs directory exists
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      bufferLogs: true,
      rawBody: true,
    });

    // Get app config
    const appCfg = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

    // Set cookie parser
    app.use(cookieParser());

    // Set global prefix for the api
    app.setGlobalPrefix('api/v1', {
      exclude: [
        { path: 'health', method: RequestMethod.ALL },
        { path: 'health/*path', method: RequestMethod.ALL },
        { path: 'docs', method: RequestMethod.ALL },
        { path: 'docs/*path', method: RequestMethod.ALL },
      ],
    });

    // Enable CORS
    const origins =
      process.env.CORS_ORIGINS?.split(',').map((o) =>
        o.trim().replace(/\/$/, ''),
      ) || '*';
    app.enableCors({
      origin: origins,
      credentials: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: [
        'Content-Type',
        'Accept',
        'Authorization',
        'X-Requested-With',
        'apollo-require-preflight',
        'ngrok-skip-browser-warning',
      ],
    });

    // Apply global pipes, interceptors, and filters
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Setup Swagger documentation
    const config = new DocumentBuilder()
      .setTitle(appCfg.name || 'API Documentation')
      .setDescription(`The API description for ${appCfg.name}`)
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);

    // Start the application
    const port = appCfg.port;
    await app.listen(port, '0.0.0.0');

    const e = process.env;
    console.log(
      `\n🚀 Server [${e.APP_NAME || 'API'}] running on http://0.0.0.0:${port}`,
    );
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📋 ENV          : ${e.NODE_ENV || 'development'}`);
    console.log(
      `🗄️  Database     : ${e.DB_HOST || 'localhost'}:${e.DB_PORT || '5432'}/${e.DB_NAME || '-'}`,
    );
    console.log(
      `⚡ Redis         : ${e.REDIS_HOST || 'localhost'}:${e.REDIS_PORT || '6379'}`,
    );
    console.log(
      `🔐 JWT Access   : expires in ${e.JWT_ACCESS_EXPIRES_IN || '-'}`,
    );
    console.log(
      `📧 SMTP         : ${e.SMTP_HOST || '-'}:${e.SMTP_PORT || '-'}`,
    );
    console.log(`🌐 CORS         : ${e.CORS_ORIGINS || '*'}`);
    console.log(`📖 Swagger Docs : http://localhost:${port}/api-docs`);
    console.log(`📚 Module Docs  : http://localhost:${port}/docs`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return app;
  } catch (error: any) {
    console.error('Failed to start application', {
      error: error?.message,
      stack: error?.stack,
    });
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
