import { describe, expect, it, afterEach } from 'vitest';
import { openDatabase, runMigrations, allMigrations } from '@ultron/database';
import { EventBus } from '@ultron/event-bus';
import { createLogger } from './logger.js';
import { EventStore } from './event-store.js';
import { AuditLog } from './audit-log.js';
import { buildServer } from './server.js';

describe('control plane server', () => {
  let app: Awaited<ReturnType<typeof buildServer>> | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  function setup() {
    const db = openDatabase({ filePath: ':memory:' });
    runMigrations(db, allMigrations);
    const eventBus = new EventBus();
    const eventStore = new EventStore(db, eventBus);
    const auditLog = new AuditLog(db);
    const logger = createLogger();

    return { db, eventBus, eventStore, auditLog, logger };
  }

  async function buildTestServer() {
    const deps = setup();
    app = await buildServer({
      logger: deps.logger,
      eventStore: deps.eventStore,
      eventBus: deps.eventBus,
      auditLog: deps.auditLog,
      dbFilePath: ':memory:',
      startedAt: new Date(),
    });
    return { app, ...deps };
  }

  it('GET /health responde ok', async () => {
    const { app } = await buildTestServer();

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok' });
  });

  it('GET /api/v1/system/status reporta versão e banco', async () => {
    const { app } = await buildTestServer();

    const response = await app.inject({ method: 'GET', url: '/api/v1/system/status' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('ok');
    expect(body.version).toBe('0.1.0');
    expect(body.database.filePath).toBe(':memory:');
  });

  it('GET /api/v1/system/capabilities reporta ambiente real detectado', async () => {
    const { app } = await buildTestServer();

    const response = await app.inject({ method: 'GET', url: '/api/v1/system/capabilities' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.environment.cpuCores).toBeGreaterThan(0);
    expect(body.environment.nodeVersion).toMatch(/^v\d+/);
  });

  it('toda resposta inclui um correlation id, gerando um se o cliente não enviar', async () => {
    const { app } = await buildTestServer();

    const response = await app.inject({ method: 'GET', url: '/health' });

    const correlationId = response.headers['x-correlation-id'];
    expect(correlationId).toBeTruthy();
    expect(String(correlationId)).toHaveLength(36); // uuid v4
  });

  it('reaproveita o correlation id enviado pelo cliente', async () => {
    const { app } = await buildTestServer();

    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-correlation-id': 'corr-fixo-123' },
    });

    expect(response.headers['x-correlation-id']).toBe('corr-fixo-123');
  });

  it('GET /api/v1/audit reflete entradas registradas', async () => {
    const { app, auditLog } = await buildTestServer();

    auditLog.record({
      correlationId: 'corr-1',
      actorType: 'user',
      action: 'test.action',
      outcome: 'success',
    });

    const response = await app.inject({ method: 'GET', url: '/api/v1/audit' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].action).toBe('test.action');
    expect(body.entries[0].actorType).toBe('user');
  });

  it('rota inexistente devolve envelope de erro padronizado com correlationId', async () => {
    const { app } = await buildTestServer();

    const response = await app.inject({ method: 'GET', url: '/rota/que/nao/existe' });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error).toBeDefined();
    expect(body.error.correlationId).toBeTruthy();
  });
});
