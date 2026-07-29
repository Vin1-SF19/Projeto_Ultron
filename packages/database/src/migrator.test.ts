import { describe, expect, it } from 'vitest';
import { openDatabase } from './connection.js';
import { runMigrations } from './migrator.js';
import { allMigrations } from './migrations/index.js';

describe('runMigrations', () => {
  it('aplica todas as migrations em um banco novo', () => {
    const db = openDatabase({ filePath: ':memory:' });

    const result = runMigrations(db, allMigrations);

    expect(result.applied).toEqual(['001_event_store']);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='events'")
      .all();
    expect(tables).toHaveLength(1);

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
});
