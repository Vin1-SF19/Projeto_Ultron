import { describe, expect, it, afterEach } from 'vitest';
import { openDatabase, runMigrations, allMigrations } from '@ultron/database';
import { createLogger } from './logger.js';
import { EventStore } from './event-store.js';
import { buildServer } from './server.js';

describe('control plane server', () => {
  let app: Awaited<ReturnType<typeof buildServer>> | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  async function setup() {
    const db = openDatabase({ filePath: ':memory:' });
    runMigrations(db, allMigrations);
    const eventStore = new EventStore(db);
    const logger = createLogger();

    app = await buildServer({ logger, eventStore, dbFilePath: ':memory:', startedAt: new Date() });
    return { app, eventStore };
  }

  it('GET /health responde ok', async () => {
    const { app } = await setup();

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok' });
  });

  it('GET /api/v1/system/status reporta versão e banco', async () => {
    const { app } = await setup();

    const response = await app.inject({ method: 'GET', url: '/api/v1/system/status' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('ok');
    expect(body.version).toBe('0.1.0');
    expect(body.database.filePath).toBe(':memory:');
  });

  it('GET /api/v1/system/capabilities reporta ambiente real detectado', async () => {
    const { app } = await setup();

    const response = await app.inject({ method: 'GET', url: '/api/v1/system/capabilities' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.environment.cpuCores).toBeGreaterThan(0);
    expect(body.environment.nodeVersion).toMatch(/^v\d+/);
  });
});
