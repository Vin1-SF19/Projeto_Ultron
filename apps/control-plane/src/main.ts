import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { openDatabase, runMigrations, allMigrations } from '@ultron/database';
import { createLogger } from './logger.js';
import { EventStore } from './event-store.js';
import { buildServer } from './server.js';

const DATA_DIR = path.join(os.homedir(), '.ultron');
const DB_FILE_PATH = path.join(DATA_DIR, 'ultron.sqlite');
const PORT = Number(process.env.ULTRON_CONTROL_PLANE_PORT ?? 4577);

async function main() {
  const logger = createLogger();
  const startedAt = new Date();

  fs.mkdirSync(DATA_DIR, { recursive: true });

  const db = openDatabase({ filePath: DB_FILE_PATH });
  const migrationResult = runMigrations(db, allMigrations);
  logger.info({ applied: migrationResult.applied }, 'migrations aplicadas');

  const eventStore = new EventStore(db);

  const app = await buildServer({ logger, eventStore, dbFilePath: DB_FILE_PATH, startedAt });

  eventStore.append({
    type: 'system.started',
    aggregateType: 'system',
    aggregateId: 'ultron-control-plane',
    source: { module: 'control-plane' },
    payload: { pid: process.pid, port: PORT },
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'encerrando control plane');
    eventStore.append({
      type: 'system.stopped',
      aggregateType: 'system',
      aggregateId: 'ultron-control-plane',
      source: { module: 'control-plane' },
      payload: { signal },
    });
    await app.close();
    db.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await app.listen({ port: PORT, host: '127.0.0.1' });
  logger.info({ port: PORT }, 'ultron control plane no ar');
}

main().catch((error) => {
  console.error('falha fatal ao iniciar o control plane:', error);
  process.exit(1);
});
