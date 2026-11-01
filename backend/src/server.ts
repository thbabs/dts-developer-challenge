import { createApp } from './app.js';
import { config } from './config.js';
import { createDatabase } from './db/database.js';
import { logger } from './logger.js';

const db = createDatabase(config.databasePath);
const app = createApp({ db, logger });

const server = app.listen(config.port, () => {
  logger.info('DTS Tasks API listening', {
    port: config.port,
    environment: config.nodeEnv,
    database: config.databasePath,
    docs: `http://localhost:${config.port}/docs`,
  });
});

function shutdown(signal: string): void {
  logger.info('Shutting down', { signal });

  server.close((error) => {
    db.close();
    if (error) {
      logger.error('Error while closing the HTTP server', { error: error.message });
      process.exitCode = 1;
    }
    process.exit();
  });

  // Do not hang forever if a connection refuses to close.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
