import { describe, expect, it, afterEach, vi } from 'vitest';
import { openDatabase, runMigrations, allMigrations } from '@ultron/database';
import { EventBus } from '@ultron/event-bus';
import { OpenClawAdapter } from '@ultron/openclaw-adapter';
import type { RoutingEngine } from '@ultron/model-gateway';
import { createLogger } from './logger.js';
import { EventStore } from './event-store.js';
import { AuditLog } from './audit-log.js';
import { buildServer } from './server.js';

function makeFakeRoutingEngine(overrides: Partial<RoutingEngine> = {}): RoutingEngine {
  return {
    route: vi.fn().mockResolvedValue({
      profileId: 'chat-fast',
      providerId: 'ollama',
      modelId: 'llama3.2:1b',
      reason: 'teste',
      fallbackUsed: false,
    }),
    execute: vi.fn().mockResolvedValue({
      decision: { profileId: 'chat-fast', providerId: 'ollama', modelId: 'llama3.2:1b', reason: 'teste', fallbackUsed: false },
      content: 'resposta de teste',
      latencyMs: 1,
    }),
    stream: vi.fn(),
    health: vi.fn().mockResolvedValue({ providers: [] }),
    listProviders: vi.fn().mockResolvedValue([{ id: 'ollama', name: 'Ollama', kind: 'local_runtime', enabled: true }]),
    listModels: vi.fn().mockResolvedValue([{ id: 'llama3.2:1b', providerId: 'ollama', displayName: 'Llama 3.2 1B', capabilities: ['text'] }]),
    ...overrides,
  };
}

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
    const openClawAdapter = new OpenClawAdapter(
      { enabled: false, url: 'ws://127.0.0.1:18789' },
      { onDomainEvent: () => {} },
    );
    const routingEngine = makeFakeRoutingEngine();

    return { db, eventBus, eventStore, auditLog, logger, openClawAdapter, routingEngine };
  }

  async function buildTestServer(routingEngineOverrides: Partial<RoutingEngine> = {}) {
    const deps = setup();
    const routingEngine = { ...deps.routingEngine, ...routingEngineOverrides };
    app = await buildServer({
      logger: deps.logger,
      eventStore: deps.eventStore,
      eventBus: deps.eventBus,
      auditLog: deps.auditLog,
      openClawAdapter: deps.openClawAdapter,
      routingEngine,
      dbFilePath: ':memory:',
      startedAt: new Date(),
    });
    return { app, ...deps, routingEngine };
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

  it('GET /api/v1/integrations/openclaw/status reporta desabilitado sem fingir conexão', async () => {
    const { app } = await buildTestServer();

    const response = await app.inject({ method: 'GET', url: '/api/v1/integrations/openclaw/status' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.state).toBe('disabled');
    expect(body.health).toBeNull();
  });

  it('GET /api/v1/providers lista providers do routing engine', async () => {
    const { app } = await buildTestServer();

    const response = await app.inject({ method: 'GET', url: '/api/v1/providers' });

    expect(response.statusCode).toBe(200);
    expect(response.json().providers).toEqual([{ id: 'ollama', name: 'Ollama', kind: 'local_runtime', enabled: true }]);
  });

  it('GET /api/v1/models lista modelos do routing engine', async () => {
    const { app } = await buildTestServer();

    const response = await app.inject({ method: 'GET', url: '/api/v1/models' });

    expect(response.statusCode).toBe(200);
    expect(response.json().models).toHaveLength(1);
  });

  it('POST /api/v1/models/execute retorna a resposta do routing engine e audita sucesso', async () => {
    const { app, auditLog } = await buildTestServer();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/models/execute',
      payload: { profileId: 'chat-fast', message: 'oi' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().content).toBe('resposta de teste');
    expect(auditLog.listRecent(10).some((e) => e.action === 'model.execute' && e.outcome === 'success')).toBe(true);
  });

  it('POST /api/v1/models/execute rejeita profileId inválido com erro padronizado', async () => {
    const { app } = await buildTestServer();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/models/execute',
      payload: { profileId: 'perfil-que-nao-existe', message: 'oi' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('invalid_request');
  });

  it('POST /api/v1/models/execute propaga falha do routing engine como erro padronizado e audita falha', async () => {
    const { app, auditLog } = await buildTestServer({
      execute: vi.fn().mockRejectedValue(new Error('nenhum provider disponível')),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/models/execute',
      payload: { profileId: 'chat-fast', message: 'oi' },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json().error.code).toBe('routing_failed');
    expect(auditLog.listRecent(10).some((e) => e.action === 'model.execute' && e.outcome === 'failure')).toBe(true);
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
