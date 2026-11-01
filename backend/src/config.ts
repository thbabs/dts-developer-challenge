import { existsSync } from 'node:fs';
import path from 'node:path';

// Load a local .env file when present (Node >= 20.12 built-in loader).
const envFile = path.resolve(process.cwd(), '.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
if (Number.isNaN(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port,
  databasePath: process.env.DATABASE_PATH ?? './data/tasks.db',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
} as const;

export type Config = typeof config;
