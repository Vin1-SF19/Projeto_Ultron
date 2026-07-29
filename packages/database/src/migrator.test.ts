import { describe, expect, it } from 'vitest';
import { openDatabase } from './connection.js';
import { runMigrations } from './migrator.js';
import { allMigrations } from './migrations/index.js';

describe('runMigrations', () => {
  it('aplica todas as migrations em um banco novo', () => {
    const db = openDatabase({ filePath: ':memory:' });

    const result = runMigrations(db, allMigrations);

    expect(result.applied).toEqual([
      '001_event_store',
      '002_audit_events',
      '003_providers',
      '004_autonomy_config',
      '005_projects',
      '006_onboarding_progress',
    ]);

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('events', 'audit_events', 'providers', 'autonomy_config', 'bounded_autonomy_rules', 'projects')",
      )
      .all();
    expect(tables).toHaveLength(6);

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

  it('autonomy_config já vem inicializada com level=observation por padrão (seguro por padrão)', () => {
    const db = openDatabase({ filePath: ':memory:' });
    runMigrations(db, allMigrations);

    const row = db.prepare('SELECT * FROM autonomy_config WHERE id = 1').get() as Record<string, unknown>;
    expect(row.level).toBe('observation');

    db.close();
  });

  it('permite inserir uma regra de autonomia delimitada', () => {
    const db = openDatabase({ filePath: ':memory:' });
    runMigrations(db, allMigrations);

    db.prepare(
      `INSERT INTO bounded_autonomy_rules (id, action_type, scope, max_budget, max_actions)
       VALUES (@id, @action_type, @scope, @max_budget, @max_actions)`,
    ).run({ id: 'rule-1', action_type: 'send_email', scope: 'projeto-x', max_budget: 50, max_actions: 10 });

    const row = db.prepare('SELECT * FROM bounded_autonomy_rules WHERE id = ?').get('rule-1');
    expect(row).toBeDefined();

    db.close();
  });

  it('permite inserir um projeto e impede caminho duplicado', () => {
    const db = openDatabase({ filePath: ':memory:' });
    runMigrations(db, allMigrations);

    db.prepare('INSERT INTO projects (id, name, path) VALUES (@id, @name, @path)').run({
      id: 'proj-1',
      name: 'Meu Projeto',
      path: 'C:\\Users\\TI\\projetos\\meu-projeto',
    });

    expect(() =>
      db
        .prepare('INSERT INTO projects (id, name, path) VALUES (@id, @name, @path)')
        .run({ id: 'proj-2', name: 'Outro', path: 'C:\\Users\\TI\\projetos\\meu-projeto' }),
    ).toThrow();

    db.close();
  });

  it('onboarding_progress já vem inicializado em welcome (retomável desde o início)', () => {
    const db = openDatabase({ filePath: ':memory:' });
    runMigrations(db, allMigrations);

    const row = db.prepare('SELECT * FROM onboarding_progress WHERE id = 1').get() as Record<string, unknown>;
    expect(row.current_step).toBe('welcome');
    expect(row.completed_steps).toBe('[]');
    expect(row.completed_at).toBeNull();

    db.close();
  });
});
