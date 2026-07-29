import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, afterEach, vi } from 'vitest';
import { openDatabase, runMigrations, allMigrations } from '@ultron/database';
import { EventBus } from '@ultron/event-bus';
import { OpenClawAdapter } from '@ultron/openclaw-adapter';
import type { RoutingEngine, ModelProviderAdapter } from '@ultron/model-gateway';
import type { SecretStore } from '@ultron/security';
import { createLogger } from './logger.js';
import { EventStore } from './event-store.js';
import { AuditLog } from './audit-log.js';
import { buildServer } from './server.js';
import { ProviderConfigStore } from './provider-config-store.js';
import { AutonomyConfigStore } from './autonomy-config-store.js';
import { ProjectStore } from './project-store.js';
import { OnboardingStore } from './onboarding-store.js';
import { VoiceConfigStore } from './voice-config-store.js';

/** SecretStore in-memory — nunca toca o keychain real do SO durante os testes. */
function makeFakeSecretStore(): SecretStore {
  const store = new Map<string, string>();
  return {
    set: vi.fn(async (ref: string, value: string) => {
      store.set(ref, value);
    }),
    get: vi.fn(async (ref: string) => store.get(ref)),
    delete: vi.fn(async (ref: string) => store.delete(ref)),
  } as unknown as SecretStore;
}

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
    const secretStore = makeFakeSecretStore();
    const providerConfigStore = new ProviderConfigStore(db, secretStore);
    const routingAdapters = new Map<string, ModelProviderAdapter>();
    const autonomyConfigStore = new AutonomyConfigStore(db);
    const projectStore = new ProjectStore(db);
    const onboardingStore = new OnboardingStore(db);
    const voiceConfigStore = new VoiceConfigStore(db, secretStore);

    return { db, eventBus, eventStore, auditLog, logger, openClawAdapter, routingEngine, secretStore, providerConfigStore, routingAdapters, autonomyConfigStore, projectStore, onboardingStore, voiceConfigStore };
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
      routingAdapters: deps.routingAdapters,
      providerConfigStore: deps.providerConfigStore,
      autonomyConfigStore: deps.autonomyConfigStore,
      projectStore: deps.projectStore,
      onboardingStore: deps.onboardingStore,
      voiceConfigStore: deps.voiceConfigStore,
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

  it('POST /api/v1/providers/config persiste provider e registra secret_ref (nunca o segredo em texto plano)', async () => {
    const { app, db, secretStore } = await buildTestServer();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/providers/config',
      payload: { name: 'Ollama Remoto', kind: 'api', baseUrl: 'https://ollama.alpha-comex.com/v1', apiKey: 'token-secreto-123' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.provider.id).toBe('ollama-remoto');
    expect(body.provider.credentialRef).toBe('ultron:provider:ollama-remoto');

    const row = db.prepare('SELECT * FROM providers WHERE id = ?').get('ollama-remoto') as Record<string, unknown>;
    expect(JSON.stringify(row)).not.toContain('token-secreto-123');
    expect(secretStore.set).toHaveBeenCalledWith('ultron:provider:ollama-remoto', 'token-secreto-123');
  });

  it('POST /api/v1/providers/config rejeita kind inválido com erro padronizado', async () => {
    const { app } = await buildTestServer();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/providers/config',
      payload: { name: 'X', kind: 'kind-invalido' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('invalid_request');
  });

  it('DELETE /api/v1/providers/config/:id remove o provider e o segredo', async () => {
    const { app, secretStore } = await buildTestServer();

    await app.inject({
      method: 'POST',
      url: '/api/v1/providers/config',
      payload: { name: 'Temp', kind: 'api', baseUrl: 'https://x.com/v1', apiKey: 'abc' },
    });

    const response = await app.inject({ method: 'DELETE', url: '/api/v1/providers/config/temp' });

    expect(response.statusCode).toBe(200);
    expect(secretStore.delete).toHaveBeenCalledWith('ultron:provider:temp');
  });

  it('GET /api/v1/settings/autonomy retorna observation por padrão (seguro por padrão)', async () => {
    const { app } = await buildTestServer();

    const response = await app.inject({ method: 'GET', url: '/api/v1/settings/autonomy' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ level: 'observation', boundedRules: [] });
  });

  it('PUT /api/v1/settings/autonomy altera o nível e audita a mudança', async () => {
    const { app, auditLog } = await buildTestServer();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/settings/autonomy',
      payload: { level: 'assistance' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().level).toBe('assistance');

    const entry = auditLog.listRecent(10).find((e) => e.action === 'autonomy.level_changed');
    expect(entry?.details).toEqual({ from: 'observation', to: 'assistance' });
  });

  it('PUT /api/v1/settings/autonomy rejeita nível inválido com erro padronizado', async () => {
    const { app } = await buildTestServer();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/settings/autonomy',
      payload: { level: 'onipotente' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('invalid_request');
  });

  it('POST /api/v1/projects valida caminho real e persiste o projeto', async () => {
    const { app, auditLog } = await buildTestServer();
    const tempDir = mkdtempSync(path.join(tmpdir(), 'ultron-project-'));

    try {
      const response = await app.inject({ method: 'POST', url: '/api/v1/projects', payload: { path: tempDir } });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.project.path).toBe(path.resolve(tempDir));
      expect(auditLog.listRecent(10).some((e) => e.action === 'project.added' && e.outcome === 'success')).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('POST /api/v1/projects rejeita caminho inexistente com erro padronizado (nunca escaneia disco às cegas)', async () => {
    const { app, auditLog } = await buildTestServer();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      payload: { path: 'C:\\este\\caminho\\nao\\existe\\de\\jeito\\nenhum' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('invalid_project_path');
    expect(auditLog.listRecent(10).some((e) => e.action === 'project.added' && e.outcome === 'failure')).toBe(true);
  });

  it('POST /api/v1/projects rejeita o mesmo caminho duas vezes', async () => {
    const { app } = await buildTestServer();
    const tempDir = mkdtempSync(path.join(tmpdir(), 'ultron-project-'));

    try {
      await app.inject({ method: 'POST', url: '/api/v1/projects', payload: { path: tempDir } });
      const second = await app.inject({ method: 'POST', url: '/api/v1/projects', payload: { path: tempDir } });

      expect(second.statusCode).toBe(400);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('GET /api/v1/projects lista projetos adicionados', async () => {
    const { app } = await buildTestServer();
    const tempDir = mkdtempSync(path.join(tmpdir(), 'ultron-project-'));

    try {
      await app.inject({ method: 'POST', url: '/api/v1/projects', payload: { path: tempDir } });
      const response = await app.inject({ method: 'GET', url: '/api/v1/projects' });

      expect(response.json().projects).toHaveLength(1);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('GET /api/v1/onboarding retorna welcome por padrão (retomável desde o início)', async () => {
    const { app } = await buildTestServer();

    const response = await app.inject({ method: 'GET', url: '/api/v1/onboarding' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ currentStep: 'welcome', completedSteps: [] });
  });

  it('POST /api/v1/onboarding/advance avança o passo e é retomável em reinícios (mesmo banco)', async () => {
    const { app } = await buildTestServer();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/onboarding/advance',
      payload: { completedStep: 'welcome', nextStep: 'diagnostics' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ currentStep: 'diagnostics', completedSteps: ['welcome'] });

    const getResponse = await app.inject({ method: 'GET', url: '/api/v1/onboarding' });
    expect(getResponse.json().currentStep).toBe('diagnostics');
  });

  it('POST /api/v1/onboarding/advance rejeita step inválido com erro padronizado', async () => {
    const { app } = await buildTestServer();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/onboarding/advance',
      payload: { completedStep: 'welcome', nextStep: 'passo-que-nao-existe' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('invalid_request');
  });

  it('POST /api/v1/onboarding/reset volta ao início', async () => {
    const { app } = await buildTestServer();

    await app.inject({
      method: 'POST',
      url: '/api/v1/onboarding/advance',
      payload: { completedStep: 'welcome', nextStep: 'diagnostics' },
    });
    const response = await app.inject({ method: 'POST', url: '/api/v1/onboarding/reset' });

    expect(response.json()).toEqual({ currentStep: 'welcome', completedSteps: [] });
  });

  it('permite CORS para a origem do app desktop empacotado (http://tauri.localhost)', async () => {
    const { app } = await buildTestServer();

    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://tauri.localhost' },
    });

    expect(response.headers['access-control-allow-origin']).toBe('http://tauri.localhost');
  });

  it('preflight OPTIONS permite DELETE e PUT (não só GET/POST) para a origem do app', async () => {
    const { app } = await buildTestServer();

    const deleteResponse = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/projects/abc',
      headers: {
        origin: 'http://tauri.localhost',
        'access-control-request-method': 'DELETE',
      },
    });
    expect(deleteResponse.headers['access-control-allow-methods']).toContain('DELETE');

    const putResponse = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/settings/autonomy',
      headers: {
        origin: 'http://tauri.localhost',
        'access-control-request-method': 'PUT',
      },
    });
    expect(putResponse.headers['access-control-allow-methods']).toContain('PUT');
  });

  it('rota inexistente devolve envelope de erro padronizado com correlationId', async () => {
    const { app } = await buildTestServer();

    const response = await app.inject({ method: 'GET', url: '/rota/que/nao/existe' });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error).toBeDefined();
    expect(body.error.correlationId).toBeTruthy();
  });

  describe('voz (ElevenLabs)', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('GET /api/v1/settings/voice reporta configured=false quando nada foi configurado', async () => {
      const { app } = await buildTestServer();

      const response = await app.inject({ method: 'GET', url: '/api/v1/settings/voice' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ configured: false });
    });

    it('PUT /api/v1/settings/voice rejeita quando a chave não é válida (verificada de verdade contra a API)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
      const { app } = await buildTestServer();

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/settings/voice',
        payload: { apiKey: 'chave-invalida', voiceId: 'abc123', voiceName: 'George' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('invalid_credential');
    });

    it('PUT /api/v1/settings/voice salva a configuração quando a chave é válida, e GET reflete o estado salvo', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ voices: [] }) }));
      const { app } = await buildTestServer();

      const putResponse = await app.inject({
        method: 'PUT',
        url: '/api/v1/settings/voice',
        payload: { apiKey: 'chave-valida', voiceId: 'abc123', voiceName: 'George' },
      });
      expect(putResponse.statusCode).toBe(200);
      expect(putResponse.json()).toEqual({ configured: true, voiceId: 'abc123', voiceName: 'George' });

      const getResponse = await app.inject({ method: 'GET', url: '/api/v1/settings/voice' });
      expect(getResponse.json()).toEqual({ configured: true, voiceId: 'abc123', voiceName: 'George' });
    });

    it('GET /api/v1/voices retorna configured=false e lista vazia quando a voz não está configurada', async () => {
      const { app } = await buildTestServer();

      const response = await app.inject({ method: 'GET', url: '/api/v1/voices' });

      expect(response.json()).toEqual({ voices: [], configured: false });
    });

    it('POST /api/v1/voice/speak retorna erro claro quando a voz não está configurada (nunca finge sucesso)', async () => {
      const { app } = await buildTestServer();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/voice/speak',
        payload: { text: 'Olá' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('voice_not_configured');
    });
  });

  describe('/ws streaming de modelo (model_stream_*)', () => {
    async function connectWs(routingEngineOverrides: Partial<RoutingEngine> = {}) {
      const built = await buildTestServer(routingEngineOverrides);
      const address = await built.app.listen({ port: 0, host: '127.0.0.1' });
      const wsUrl = address.replace('http://', 'ws://') + '/ws';
      const socket = new WebSocket(wsUrl);

      // Fila todas as mensagens desde a conexão (inclusive o replay inicial),
      // para nextMessage() nunca perder uma mensagem que chegou entre awaits.
      const queue: Record<string, unknown>[] = [];
      const waiters: Array<(msg: Record<string, unknown>) => void> = [];
      socket.addEventListener('message', (event) => {
        const parsed = JSON.parse(event.data as string) as Record<string, unknown>;
        const waiter = waiters.shift();
        if (waiter) waiter(parsed);
        else queue.push(parsed);
      });

      await new Promise((resolve, reject) => {
        socket.addEventListener('open', () => resolve(undefined), { once: true });
        socket.addEventListener('error', reject, { once: true });
      });

      return { ...built, socket, queue, waiters };
    }

    function nextMessage(conn: { queue: Record<string, unknown>[]; waiters: Array<(msg: Record<string, unknown>) => void> }): Promise<Record<string, unknown>> {
      const queued = conn.queue.shift();
      if (queued) return Promise.resolve(queued);
      return new Promise((resolve) => conn.waiters.push(resolve));
    }

    it('emite model_stream_token incrementalmente e depois model_stream_done', async () => {
      const streamImpl = vi.fn(async (_request, callbacks: { onToken?: (t: string) => void; onDone?: (r: unknown) => void }) => {
        callbacks.onToken?.('olá');
        callbacks.onToken?.(' mundo');
        callbacks.onDone?.({
          decision: { profileId: 'chat-fast', providerId: 'ollama', modelId: 'llama3.2:1b', reason: 'teste', fallbackUsed: false },
          content: 'olá mundo',
          latencyMs: 1,
        });
        return { cancel: () => {} };
      });

      const conn = await connectWs({ stream: streamImpl });

      // primeira mensagem recebida ao conectar é sempre o replay inicial
      await nextMessage(conn);

      conn.socket.send(JSON.stringify({ kind: 'model_stream_start', requestId: 'req-1', profileId: 'chat-fast', text: 'oi' }));

      const token1 = await nextMessage(conn);
      expect(token1).toMatchObject({ kind: 'model_stream_token', requestId: 'req-1', token: 'olá' });

      const token2 = await nextMessage(conn);
      expect(token2).toMatchObject({ kind: 'model_stream_token', requestId: 'req-1', token: ' mundo' });

      const done = await nextMessage(conn);
      expect(done).toMatchObject({ kind: 'model_stream_done', requestId: 'req-1' });
      expect((done.response as { content: string }).content).toBe('olá mundo');

      conn.socket.close();
    });

    it('emite model_stream_error quando o provider falha, sem emitir model_stream_done', async () => {
      const streamImpl = vi.fn(async (_request, callbacks: { onError?: (e: Error) => void }) => {
        callbacks.onError?.(new Error('provider indisponível'));
        return { cancel: () => {} };
      });

      const conn = await connectWs({ stream: streamImpl });
      await nextMessage(conn);

      conn.socket.send(JSON.stringify({ kind: 'model_stream_start', requestId: 'req-2', profileId: 'chat-fast', text: 'oi' }));

      const error = await nextMessage(conn);
      expect(error).toMatchObject({ kind: 'model_stream_error', requestId: 'req-2', message: 'provider indisponível' });

      conn.socket.close();
    });

    it('rejeita model_stream_start sem campos obrigatórios com model_stream_error', async () => {
      const conn = await connectWs();
      await nextMessage(conn);

      conn.socket.send(JSON.stringify({ kind: 'model_stream_start', requestId: 'req-3' }));

      const error = await nextMessage(conn);
      expect(error.kind).toBe('model_stream_error');
      expect(error.requestId).toBe('req-3');

      conn.socket.close();
    });
  });
});
