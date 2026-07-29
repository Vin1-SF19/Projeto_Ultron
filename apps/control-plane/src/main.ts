import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { openDatabase, runMigrations, allMigrations } from '@ultron/database';
import { EventBus } from '@ultron/event-bus';
import { createLogger } from './logger.js';
import { EventStore } from './event-store.js';
import { AuditLog } from './audit-log.js';
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

  const eventBus = new EventBus((error, event) => {
    logger.error({ err: error, eventType: event.type }, 'assinante do event bus falhou');
  });
  const eventStore = new EventStore(db, eventBus);
  const auditLog = new AuditLog(db);

  const app = await buildServer({ logger, eventStore, eventBus, auditLog, dbFilePath: DB_FILE_PATH, startedAt });

  eventStore.append({
    type: 'system.started',
    aggregateType: 'system',
    aggregateId: 'ultron-control-plane',
    source: { module: 'control-plane' },
    payload: { pid: process.pid, port: PORT },
  });
  auditLog.record({
    correlationId: randomUUID(),
    actorType: 'system',
    action: 'control_plane.started',
    outcome: 'success',
    details: { pid: process.pid, port: PORT },
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
    auditLog.record({
      correlationId: randomUUID(),
      actorType: 'system',
      action: 'control_plane.stopped',
      outcome: 'success',
      details: { signal },
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
