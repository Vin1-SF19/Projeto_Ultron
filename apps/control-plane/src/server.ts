import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import type { EventBus } from '@ultron/event-bus';
import type { OpenClawAdapter } from '@ultron/openclaw-adapter';
import type { RoutingEngine } from '@ultron/model-gateway';
import { routingProfileIdSchema } from '@ultron/contracts';
import type { Logger } from './logger.js';
import type { EventStore } from './event-store.js';
import type { AuditLog } from './audit-log.js';
import { detectEnvironment } from './environment.js';
import { UltronError, toErrorResponseBody } from './errors.js';

export interface ServerDeps {
  logger: Logger;
  eventStore: EventStore;
  eventBus: EventBus;
  auditLog: AuditLog;
  openClawAdapter: OpenClawAdapter;
  routingEngine: RoutingEngine;
  dbFilePath: string;
  startedAt: Date;
}

const CORRELATION_HEADER = 'x-correlation-id';

declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
  }
}

export async function buildServer(deps: ServerDeps) {
  const app = Fastify({ loggerInstance: deps.logger });

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

    socket.on('message', (raw: Buffer) => {
      let message: { kind?: string; cursor?: string } | undefined;
      try {
        message = JSON.parse(raw.toString()) as { kind?: string; cursor?: string };
      } catch {
        socket.send(JSON.stringify({ kind: 'error', message: 'mensagem não é JSON válido' }));
        return;
      }

      if (message?.kind === 'replay_since' && typeof message.cursor === 'string') {
        const events = deps.eventStore.listSince(message.cursor);
        socket.send(JSON.stringify({ kind: 'replay', events }));
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
