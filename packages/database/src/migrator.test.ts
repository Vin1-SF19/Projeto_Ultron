import { describe, expect, it } from 'vitest';
import { openDatabase } from './connection.js';
import { runMigrations } from './migrator.js';
import { allMigrations } from './migrations/index.js';

describe('runMigrations', () => {
  it('aplica todas as migrations em um banco novo', () => {
    const db = openDatabase({ filePath: ':memory:' });

    const result = runMigrations(db, allMigrations);

    expect(result.applied).toEqual(['001_event_store', '002_audit_events', '003_providers']);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('events', 'audit_events', 'providers')")
      .all();
    expect(tables).toHaveLength(3);

    db.close();
  });

  it('é idempotente — não reaplica migrations já aplicadas', () => {
    const db = openDatabase({ filePath: ':memory:' });

    runMigrations(db, allMigrations);
    const second = runMigrations(db, allMigrations);

    expect(second.applied).toEqual([]);

    db.close();
  });

  it('permite inserir e ler um evento de domínio', () => {
    const db = openDatabase({ filePath: ':memory:' });
    runMigrations(db, allMigrations);

    db.prepare(
      `INSERT INTO events (id, schema_version, type, timestamp, aggregate_type, aggregate_id, correlation_id, source_module, payload)
       VALUES (@id, @schema_version, @type, @timestamp, @aggregate_type, @aggregate_id, @correlation_id, @source_module, @payload)`,
    ).run({
      id: 'evt_1',
      schema_version: 1,
      type: 'system.started',
      timestamp: new Date().toISOString(),
      aggregate_type: 'system',
      aggregate_id: 'ultron-control-plane',
      correlation_id: 'corr_1',
      source_module: 'control-plane',
      payload: JSON.stringify({ pid: 1234 }),
    });

    const row = db.prepare('SELECT * FROM events WHERE id = ?').get('evt_1');
    expect(row).toBeDefined();

    db.close();
  });

  it('permite inserir e ler um evento de auditoria', () => {
    const db = openDatabase({ filePath: ':memory:' });
    runMigrations(db, allMigrations);

    db.prepare(
      `INSERT INTO audit_events (id, timestamp, correlation_id, actor_type, actor_id, action, outcome, target_type, target_id, details)
       VALUES (@id, @timestamp, @correlation_id, @actor_type, @actor_id, @action, @outcome, @target_type, @target_id, @details)`,
    ).run({
      id: 'audit_1',
      timestamp: new Date().toISOString(),
      correlation_id: 'corr_1',
      actor_type: 'system',
      actor_id: null,
      action: 'system.health_check',
      outcome: 'success',
      target_type: null,
      target_id: null,
      details: JSON.stringify({}),
    });

    const row = db.prepare('SELECT * FROM audit_events WHERE id = ?').get('audit_1');
    expect(row).toBeDefined();

    db.close();
  });

  it('permite inserir um provider com secret_ref, nunca com o segredo em si', () => {
    const db = openDatabase({ filePath: ':memory:' });
    runMigrations(db, allMigrations);

    db.prepare(
      `INSERT INTO providers (id, name, kind, base_url, secret_ref, enabled)
       VALUES (@id, @name, @kind, @base_url, @secret_ref, @enabled)`,
    ).run({
      id: 'ollama-remote',
      name: 'Ollama Remoto',
      kind: 'api',
      base_url: 'https://ollama.alpha-comex.com/v1',
      secret_ref: 'ultron:provider:ollama-remote',
      enabled: 1,
    });

    const row = db.prepare('SELECT * FROM providers WHERE id = ?').get('ollama-remote') as Record<string, unknown>;
    expect(row).toBeDefined();
    expect(row.secret_ref).toBe('ultron:provider:ollama-remote');
    expect(Object.values(row).join('')).not.toContain('zQSTFEugrFp4Uf');

    db.close();
  });
});
