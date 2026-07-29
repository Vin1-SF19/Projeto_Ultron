import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import cors from '@fastify/cors';
import type { EventBus } from '@ultron/event-bus';
import type { OpenClawAdapter } from '@ultron/openclaw-adapter';
import type { RoutingEngine, ModelProviderAdapter, ModelRunHandle } from '@ultron/model-gateway';
import { OpenAiCompatibleAdapter } from '@ultron/openai-compatible-adapter';
import { autonomyLevelSchema, onboardingStepSchema, providerKindSchema, routingProfileIdSchema } from '@ultron/contracts';
import type { Logger } from './logger.js';
import type { EventStore } from './event-store.js';
import type { AuditLog } from './audit-log.js';
import type { ProviderConfigStore } from './provider-config-store.js';
import type { AutonomyConfigStore } from './autonomy-config-store.js';
import { InvalidProjectPathError, type ProjectStore } from './project-store.js';
import type { OnboardingStore } from './onboarding-store.js';
import { detectEnvironment } from './environment.js';
import { UltronError, toErrorResponseBody } from './errors.js';

export interface ServerDeps {
  logger: Logger;
  eventStore: EventStore;
  eventBus: EventBus;
  auditLog: AuditLog;
  openClawAdapter: OpenClawAdapter;
  routingEngine: RoutingEngine;
  routingAdapters: Map<string, ModelProviderAdapter>;
  providerConfigStore: ProviderConfigStore;
  autonomyConfigStore: AutonomyConfigStore;
  projectStore: ProjectStore;
  onboardingStore: OnboardingStore;
  dbFilePath: string;
  startedAt: Date;
}

const CORRELATION_HEADER = 'x-correlation-id';

declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
  }
}

// Origens do app desktop: WebView2/WKWebView servem o frontend empacotado
// sob esses esquemas (variam por plataforma e por dev vs. build), nunca
// como uma origem web pública arbitrária.
const ALLOWED_ORIGINS = [
  'tauri://localhost',
  'http://tauri.localhost',
  'https://tauri.localhost',
  'http://localhost:1420',
];

export async function buildServer(deps: ServerDeps) {
  const app = Fastify({ loggerInstance: deps.logger });

  await app.register(cors, {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  await app.register(websocketPlugin);

  app.addHook('onRequest', async (request, reply) => {
    const incoming = request.headers[CORRELATION_HEADER];
    request.correlationId = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
    reply.header(CORRELATION_HEADER, request.correlationId);
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof UltronError) {
      reply
        .status(error.statusCode)
        .send(
          toErrorResponseBody({
            code: error.code,
            message: error.message,
            correlationId: request.correlationId,
            details: error.details,
          }),
        );
      return;
    }

    // Falha não esperada: nunca esconder — logar com stack completo e
    // devolver uma mensagem útil (não genérica), preservando o correlationId
    // para correlacionar com os logs.
    const message = error instanceof Error ? error.message : String(error);
    request.log.error({ err: error, correlationId: request.correlationId }, 'erro não tratado');
    reply.status(500).send(
      toErrorResponseBody({
        code: 'internal_error',
        message: message || 'Erro interno inesperado no Control Plane.',
        correlationId: request.correlationId,
      }),
    );
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send(
      toErrorResponseBody({
        code: 'not_found',
        message: `Rota não encontrada: ${request.method} ${request.url}`,
        correlationId: request.correlationId,
      }),
    );
  });

  app.get('/health', async () => {
    return { status: 'ok', uptimeSeconds: process.uptime() };
  });

  app.get('/api/v1/system/status', async () => {
    return {
      status: 'ok',
      version: '0.1.0',
      startedAt: deps.startedAt.toISOString(),
      uptimeSeconds: process.uptime(),
      database: { filePath: deps.dbFilePath },
    };
  });

  app.get('/api/v1/system/capabilities', async () => {
    return { environment: detectEnvironment() };
  });

  app.get('/api/v1/audit', async (request) => {
    return { entries: deps.auditLog.listRecent(100), correlationId: request.correlationId };
  });

  app.get('/api/v1/settings/autonomy', async () => {
    return deps.autonomyConfigStore.get();
  });

  app.put('/api/v1/settings/autonomy', async (request) => {
    const body = request.body as { level?: string };
    const level = autonomyLevelSchema.safeParse(body?.level);
    if (!level.success) {
      throw new UltronError('invalid_request', 'Campo obrigatório: level (nível de autonomia válido)', 400);
    }

    const previous = deps.autonomyConfigStore.get().level;
    deps.autonomyConfigStore.setLevel(level.data);

    deps.auditLog.record({
      correlationId: request.correlationId,
      actorType: 'user',
      action: 'autonomy.level_changed',
      outcome: 'success',
      details: { from: previous, to: level.data },
    });

    return deps.autonomyConfigStore.get();
  });

  app.get('/api/v1/onboarding', async () => {
    return deps.onboardingStore.get();
  });

  app.post('/api/v1/onboarding/advance', async (request) => {
    const body = request.body as { completedStep?: string; nextStep?: string };
    const completedStep = onboardingStepSchema.safeParse(body?.completedStep);
    const nextStep = onboardingStepSchema.safeParse(body?.nextStep);
    if (!completedStep.success || !nextStep.success) {
      throw new UltronError('invalid_request', 'Campos obrigatórios: completedStep, nextStep (válidos)', 400);
    }

    const progress = deps.onboardingStore.advance(completedStep.data, nextStep.data);

    deps.auditLog.record({
      correlationId: request.correlationId,
      actorType: 'user',
      action: 'onboarding.step_completed',
      outcome: 'success',
      details: { completedStep: completedStep.data, nextStep: nextStep.data },
    });

    return progress;
  });

  app.post('/api/v1/onboarding/reset', async (request) => {
    const progress = deps.onboardingStore.reset();
    deps.auditLog.record({
      correlationId: request.correlationId,
      actorType: 'user',
      action: 'onboarding.reset',
      outcome: 'success',
    });
    return progress;
  });

  app.get('/api/v1/projects', async () => {
    return { projects: deps.projectStore.list() };
  });

  app.post('/api/v1/projects', async (request) => {
    const body = request.body as { path?: string; name?: string };
    if (!body?.path) {
      throw new UltronError('invalid_request', 'Campo obrigatório: path', 400);
    }

    try {
      const project = deps.projectStore.add({ path: body.path, name: body.name });
      deps.auditLog.record({
        correlationId: request.correlationId,
        actorType: 'user',
        action: 'project.added',
        outcome: 'success',
        targetType: 'project',
        targetId: project.id,
        details: { path: project.path },
      });
      return { project };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.auditLog.record({
        correlationId: request.correlationId,
        actorType: 'user',
        action: 'project.added',
        outcome: 'failure',
        details: { path: body.path, error: message },
      });
      if (error instanceof InvalidProjectPathError) {
        throw new UltronError('invalid_project_path', message, 400);
      }
      throw new UltronError('project_add_failed', message, 500);
    }
  });

  app.delete('/api/v1/projects/:id', async (request) => {
    const { id } = request.params as { id: string };
    deps.projectStore.remove(id);
    deps.auditLog.record({
      correlationId: request.correlationId,
      actorType: 'user',
      action: 'project.removed',
      outcome: 'success',
      targetType: 'project',
      targetId: id,
    });
    return { removed: true };
  });

  app.get('/api/v1/integrations/openclaw/status', async () => {
    const state = deps.openClawAdapter.getState();
    if (state === 'disabled') {
      // Nunca fingir conexão (seção 9.2 do prompt mestre) — reportar
      // explicitamente que a integração está desligada, não "conectado".
      return { state, health: null, note: 'Integração OpenClaw não configurada (defina OPENCLAW_GATEWAY_URL).' };
    }
    const health = await deps.openClawAdapter.health();
    return { state, health };
  });

  app.get('/api/v1/providers', async () => {
    return { providers: await deps.routingEngine.listProviders() };
  });

  app.get('/api/v1/providers/health', async () => {
    return await deps.routingEngine.health();
  });

  app.post('/api/v1/providers/config', async (request) => {
    const body = request.body as { name?: string; kind?: string; baseUrl?: string; apiKey?: string };
    const kind = providerKindSchema.safeParse(body?.kind);
    if (!body?.name || !kind.success) {
      throw new UltronError('invalid_request', 'Campos obrigatórios: name, kind (válido)', 400);
    }

    try {
      const provider = await deps.providerConfigStore.upsert({
        name: body.name,
        kind: kind.data,
        baseUrl: body.baseUrl,
        apiKey: body.apiKey,
      });

      // Registrar/atualizar o adapter em memória imediatamente — o próximo
      // /models/execute já enxerga o provider recém-configurado, sem reiniciar.
      if (provider.baseUrl && body.apiKey) {
        deps.routingAdapters.set(
          provider.id,
          new OpenAiCompatibleAdapter({
            providerId: provider.id,
            displayName: provider.name,
            baseUrl: provider.baseUrl,
            apiKey: body.apiKey,
          }),
        );
      }

      deps.auditLog.record({
        correlationId: request.correlationId,
        actorType: 'user',
        action: 'provider.configured',
        outcome: 'success',
        targetType: 'provider',
        targetId: provider.id,
        details: { name: provider.name, kind: provider.kind, hasCredential: Boolean(body.apiKey) },
      });

      return { provider };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.auditLog.record({
        correlationId: request.correlationId,
        actorType: 'user',
        action: 'provider.configured',
        outcome: 'failure',
        details: { name: body.name, error: message },
      });
      throw new UltronError('provider_config_failed', message, 500);
    }
  });

  app.delete('/api/v1/providers/config/:id', async (request) => {
    const { id } = request.params as { id: string };
    await deps.providerConfigStore.remove(id);
    deps.routingAdapters.delete(id);
    deps.auditLog.record({
      correlationId: request.correlationId,
      actorType: 'user',
      action: 'provider.removed',
      outcome: 'success',
      targetType: 'provider',
      targetId: id,
    });
    return { removed: true };
  });

  app.get('/api/v1/models', async () => {
    return { models: await deps.routingEngine.listModels() };
  });

  app.post('/api/v1/models/route', async (request) => {
    const body = request.body as { profileId?: string; message?: string };
    const profileId = routingProfileIdSchema.safeParse(body?.profileId);
    if (!profileId.success || !body?.message) {
      throw new UltronError('invalid_request', 'Campos obrigatórios: profileId (válido), message', 400);
    }

    try {
      const decision = await deps.routingEngine.route({
        profileId: profileId.data,
        messages: [{ role: 'user', content: body.message }],
      });
      return { decision };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new UltronError('routing_failed', message, 503);
    }
  });

  app.post('/api/v1/models/execute', async (request) => {
    const body = request.body as { profileId?: string; message?: string };
    const profileId = routingProfileIdSchema.safeParse(body?.profileId);
    if (!profileId.success || !body?.message) {
      throw new UltronError('invalid_request', 'Campos obrigatórios: profileId (válido), message', 400);
    }

    try {
      const response = await deps.routingEngine.execute({
        profileId: profileId.data,
        messages: [{ role: 'user', content: body.message }],
      });
      deps.auditLog.record({
        correlationId: request.correlationId,
        actorType: 'user',
        action: 'model.execute',
        outcome: 'success',
        targetType: 'model',
        targetId: response.decision.modelId,
        details: { profileId: profileId.data, providerId: response.decision.providerId },
      });
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.auditLog.record({
        correlationId: request.correlationId,
        actorType: 'user',
        action: 'model.execute',
        outcome: 'failure',
        details: { profileId: profileId.data, error: message },
      });
      throw new UltronError('routing_failed', message, 503);
    }
  });

  app.get('/ws', { websocket: true }, (socket, request) => {
    const clientId = randomUUID();
    deps.logger.info({ clientId }, 'cliente websocket conectado');
    deps.auditLog.record({
      correlationId: request.id,
      actorType: 'system',
      action: 'websocket.connected',
      outcome: 'success',
      targetType: 'websocket_client',
      targetId: clientId,
    });

    const unsubscribe = deps.eventBus.subscribe((event) => {
      try {
        socket.send(JSON.stringify({ kind: 'event', event }));
      } catch (error) {
        deps.logger.warn({ clientId, err: error }, 'falha ao enviar evento para cliente websocket');
      }
    });

    const activeStreams = new Map<string, ModelRunHandle>();

    socket.on('message', (raw: Buffer) => {
      let message:
        | { kind?: string; cursor?: string; requestId?: string; profileId?: string; text?: string }
        | undefined;
      try {
        message = JSON.parse(raw.toString()) as typeof message;
      } catch {
        socket.send(JSON.stringify({ kind: 'error', message: 'mensagem não é JSON válido' }));
        return;
      }

      if (message?.kind === 'replay_since' && typeof message.cursor === 'string') {
        const events = deps.eventStore.listSince(message.cursor);
        socket.send(JSON.stringify({ kind: 'replay', events }));
        return;
      }

      if (message?.kind === 'model_stream_start') {
        const requestId = message.requestId;
        const profileId = routingProfileIdSchema.safeParse(message.profileId);
        if (!requestId || !profileId.success || !message.text) {
          socket.send(
            JSON.stringify({
              kind: 'model_stream_error',
              requestId,
              message: 'Campos obrigatórios: requestId, profileId (válido), text',
            }),
          );
          return;
        }

        void deps.routingEngine
          .stream(
            { profileId: profileId.data, messages: [{ role: 'user', content: message.text }] },
            {
              onToken: (token) => {
                socket.send(JSON.stringify({ kind: 'model_stream_token', requestId, token }));
              },
              onDone: (response) => {
                activeStreams.delete(requestId);
                socket.send(JSON.stringify({ kind: 'model_stream_done', requestId, response }));
                deps.auditLog.record({
                  correlationId: request.id,
                  actorType: 'user',
                  action: 'model.execute',
                  outcome: 'success',
                  targetType: 'model',
                  targetId: response.decision.modelId,
                  details: { profileId: profileId.data, providerId: response.decision.providerId, streamed: true },
                });
              },
              onError: (error) => {
                activeStreams.delete(requestId);
                socket.send(JSON.stringify({ kind: 'model_stream_error', requestId, message: error.message }));
                deps.auditLog.record({
                  correlationId: request.id,
                  actorType: 'user',
                  action: 'model.execute',
                  outcome: 'failure',
                  details: { profileId: profileId.data, error: error.message, streamed: true },
                });
              },
            },
          )
          .then((handle) => {
            activeStreams.set(requestId, handle);
          })
          .catch((error: unknown) => {
            const messageText = error instanceof Error ? error.message : String(error);
            socket.send(JSON.stringify({ kind: 'model_stream_error', requestId, message: messageText }));
          });
        return;
      }

      if (message?.kind === 'model_stream_cancel' && typeof message.requestId === 'string') {
        activeStreams.get(message.requestId)?.cancel();
        activeStreams.delete(message.requestId);
        return;
      }

      socket.send(JSON.stringify({ kind: 'error', message: `mensagem não reconhecida: ${message?.kind}` }));
    });

    socket.send(JSON.stringify({ kind: 'replay', events: deps.eventStore.listRecent(50) }));

    socket.on('close', () => {
      unsubscribe();
      deps.logger.info({ clientId }, 'cliente websocket desconectado');
      deps.auditLog.record({
        correlationId: request.id,
        actorType: 'system',
        action: 'websocket.disconnected',
        outcome: 'success',
        targetType: 'websocket_client',
        targetId: clientId,
      });
    });
  });

  return app;
}
