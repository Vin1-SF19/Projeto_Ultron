import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { openDatabase, runMigrations, allMigrations } from '@ultron/database';
import { EventBus } from '@ultron/event-bus';
import { OpenClawAdapter } from '@ultron/openclaw-adapter';
import { NativeRoutingEngine } from '@ultron/model-gateway';
import { OllamaAdapter } from '@ultron/ollama-adapter';
import { createLogger } from './logger.js';
import { EventStore } from './event-store.js';
import { AuditLog } from './audit-log.js';
import { buildServer } from './server.js';
import { loadOpenClawConfig } from './integrations-config.js';
import { defaultRoutingProfiles } from './routing-config.js';

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

  const openClawConfig = loadOpenClawConfig(process.env);
  const openClawAdapter = new OpenClawAdapter(openClawConfig, {
    onDomainEvent: (event) => {
      // O adapter já traduziu para DomainEvent (camada anticorrupção); aqui só persistimos/publicamos.
      eventStore.append({
        type: event.type,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        correlationId: event.correlationId,
        source: event.source,
        payload: event.payload,
      });
    },
    logInfo: (message, meta) => logger.info(meta, message),
    logError: (message, meta) => logger.error(meta, message),
  });
  if (openClawConfig.enabled) {
    openClawAdapter.connect();
  } else {
    logger.info('OpenClaw desabilitado (defina OPENCLAW_GATEWAY_URL para habilitar)');
  }

  const routingEngine = new NativeRoutingEngine({
    profiles: defaultRoutingProfiles(),
    adapters: new Map([['ollama', new OllamaAdapter()]]),
    onDecision: (decision) => {
      logger.info(decision, 'decisão de roteamento de modelo');
    },
  });

  const app = await buildServer({
    logger,
    eventStore,
    eventBus,
    auditLog,
    openClawAdapter,
    routingEngine,
    dbFilePath: DB_FILE_PATH,
    startedAt,
  });

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
    openClawAdapter.disconnect();
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
