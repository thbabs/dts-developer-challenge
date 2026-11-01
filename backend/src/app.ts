import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { config } from './config.js';
import type { Db } from './db/database.js';
import { createErrorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { silentLogger, type Logger } from './logger.js';
import { openApiDocument } from './openapi.js';
import { TaskRepository } from './tasks/task.repository.js';
import { createTaskRouter } from './tasks/task.routes.js';
import { TaskService } from './tasks/task.service.js';

export interface CreateAppOptions {
  db: Db;
  logger?: Logger;
}

function resolveCorsOrigin(origin: string): boolean | string[] {
  if (origin.trim() === '*') {
    return true;
  }
  return origin
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function createApp({ db, logger = silentLogger }: CreateAppOptions): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Swagger UI ships an inline bootstrap script and inline styles.
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
        },
      },
    }),
  );
  app.use(cors({ origin: resolveCorsOrigin(config.corsOrigin) }));
  app.use(express.json({ limit: '100kb' }));
  app.use(requestLogger(logger));

  const taskService = new TaskService(new TaskRepository(db));

  app.get('/health', (_req, res) => {
    let database = 'ok';
    try {
      db.prepare('SELECT 1').get();
    } catch {
      database = 'unavailable';
    }

    res.status(database === 'ok' ? 200 : 503).json({
      status: database === 'ok' ? 'ok' : 'degraded',
      database,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/openapi.json', (_req, res) => {
    res.json(openApiDocument);
  });

  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument as unknown as Record<string, unknown>, {
      customSiteTitle: 'DTS Tasks API documentation',
    }),
  );

  app.use('/api/tasks', createTaskRouter(taskService));

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
