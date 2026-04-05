import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const logger = new Logger('WorkerMain');
  const app = await NestFactory.createApplicationContext(WorkerModule);

  // Enable shutdown hooks
  app.enableShutdownHooks();

  logger.log('⚙️ Voice identification worker started and listening for jobs');

  // Keep the process alive by maintaining an active handle in the event loop.
  // A pending promise is NOT enough to keep Node.js from exiting if the loop is empty.
  const keepAlive = setInterval(
    () => {
      // This empty timer keeps the event loop active.
    },
    1000 * 60 * 60,
  ); // Check once per hour to be extremely low overhead.

  // Promise that only resolves when a signal is received
  const shutdownPromise = new Promise<void>((resolve) => {
    const shutdown = async (signal: string) => {
      logger.log(`⚙️ Received ${signal}. Worker context closing...`);
      clearInterval(keepAlive);
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

    process.on('SIGTERM', () => {
      void shutdown('SIGTERM');
    });
    process.on('SIGINT', () => {
      void shutdown('SIGINT');
    });
  });

  await shutdownPromise;
  process.exit(0);
}

void bootstrap();
