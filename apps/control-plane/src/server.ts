import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import type { Logger } from './logger.js';
import type { EventStore } from './event-store.js';
import { detectEnvironment } from './environment.js';

export interface ServerDeps {
  logger: Logger;
  eventStore: EventStore;
  dbFilePath: string;
  startedAt: Date;
}

export async function buildServer(deps: ServerDeps) {
  const app = Fastify({ loggerInstance: deps.logger });

  await app.register(websocketPlugin);

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

  app.get('/ws', { websocket: true }, (socket) => {
    deps.logger.info('cliente websocket conectado');

    const unsubscribe = deps.eventStore.subscribe((event) => {
      socket.send(JSON.stringify({ kind: 'event', event }));
    });

    socket.send(
      JSON.stringify({ kind: 'replay', events: deps.eventStore.listRecent(50) }),
    );

    socket.on('close', () => {
      unsubscribe();
      deps.logger.info('cliente websocket desconectado');
    });
  });

  return app;
}
