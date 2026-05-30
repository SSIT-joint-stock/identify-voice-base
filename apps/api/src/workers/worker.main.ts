import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const logger = new Logger('WorkerMain');
  const app = await NestFactory.createApplicationContext(WorkerModule);

  app.enableShutdownHooks();
  logger.log(
    '⚙️ Worker started and listening for update-voice/batch-file jobs',
  );

  const shutdownPromise = new Promise<void>((resolve) => {
    const shutdown = async (signal: string) => {
      logger.log(`⚙️ Received ${signal}. Worker context closing...`);
      try {
        await app.close();
        logger.log(`⚙️ Worker context closed successfully.`);
        resolve();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error(`⚙️ Error during closure: ${errorMessage}`);
        process.exit(1);
      }
    };

    process.once('SIGTERM', () => {
      void shutdown('SIGTERM');
    });
    process.once('SIGINT', () => {
      void shutdown('SIGINT');
    });

    process.once('uncaughtException', (error) => {
      logger.error(`⚙️ Uncaught exception: ${error.message}`, error.stack);
      void shutdown('uncaughtException');
    });
    process.once('unhandledRejection', (reason) => {
      const errorMessage =
        reason instanceof Error ? reason.message : String(reason);
      logger.error(`⚙️ Unhandled rejection: ${errorMessage}`);
      void shutdown('unhandledRejection');
    });
  });

  try {
    await app.init();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(`⚙️ Worker bootstrap failed: ${errorMessage}`);
    await app.close();
    process.exit(1);
  }

  const configService = app.get(ConfigService);
  const aiUrl = configService.get<string>('ai.url');
  const ocrUrl = configService.get<string>('ai.ocr.url');
  const speechToTextUrl = configService.get<string>('ai.speechToText.url');
  const translationUrl = configService.get<string>('ai.translation.url');
  logger.log(
    `⚙️ AI config resolved: url=${aiUrl ?? 'undefined'} ocr=${ocrUrl ?? 'undefined'} s2t=${speechToTextUrl ?? 'undefined'} translate=${translationUrl ?? 'undefined'}`,
  );

  try {
    app.get('BullQueue_update-voice');
    app.get('BullQueue_batch-file');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(`⚙️ Worker queue registration failed: ${errorMessage}`);
    await app.close();
    process.exit(1);
  }

  await shutdownPromise;
  process.exit(0);
}

void bootstrap();
