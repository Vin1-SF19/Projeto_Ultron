import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { openDatabase, runMigrations, allMigrations } from '@ultron/database';
import { EventBus } from '@ultron/event-bus';
import { EventStore } from './event-store.js';

describe('EventStore', () => {
  it('persiste um evento e o publica no event bus', () => {
    const db = openDatabase({ filePath: ':memory:' });
    runMigrations(db, allMigrations);
    const eventBus = new EventBus();
    const received = vi.fn();
    eventBus.subscribe(received);

    const store = new EventStore(db, eventBus);
    const event = store.append({
      type: 'system.started',
      aggregateType: 'system',
      aggregateId: 'ultron-control-plane',
      source: { module: 'test' },
      payload: { pid: 1 },
    });

    expect(received).toHaveBeenCalledWith(expect.objectContaining({ id: event.id }));
    expect(store.listRecent(10)).toHaveLength(1);

    db.close();
  });

  it('listSince retorna apenas eventos gravados após o cursor', () => {
    const db = openDatabase({ filePath: ':memory:' });
    runMigrations(db, allMigrations);
    const store = new EventStore(db, new EventBus());

    const first = store.append({
      type: 'system.started',
      aggregateType: 'system',
      aggregateId: 'a',
      source: { module: 'test' },
      payload: {},
    });
    const second = store.append({
      type: 'task.created',
      aggregateType: 'task',
      aggregateId: 'b',
      source: { module: 'test' },
      payload: {},
    });

    const since = store.listSince(first.id);

    expect(since).toHaveLength(1);
    expect(since[0]?.id).toBe(second.id);

    db.close();
  });

  it('sobrevive a reinício: eventos gravados antes de fechar o processo são lidos após reabrir o mesmo arquivo', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'ultron-event-store-'));
    const dbFilePath = path.join(dir, 'ultron.sqlite');

    try {
      // "Processo 1": abre, grava, fecha (simulando desligamento).
      const db1 = openDatabase({ filePath: dbFilePath });
      runMigrations(db1, allMigrations);
      const store1 = new EventStore(db1, new EventBus());
      store1.append({
        type: 'system.started',
        aggregateType: 'system',
        aggregateId: 'ultron-control-plane',
        source: { module: 'test' },
        payload: { run: 1 },
      });
      db1.close();

      // "Processo 2": reabre o mesmo arquivo (simulando reinício da aplicação).
      const db2 = openDatabase({ filePath: dbFilePath });
      runMigrations(db2, allMigrations); // idempotente — não deve duplicar nada.
      const store2 = new EventStore(db2, new EventBus());
      const eventsAfterRestart = store2.listRecent(10);

      expect(eventsAfterRestart).toHaveLength(1);
      expect(eventsAfterRestart[0]?.payload).toEqual({ run: 1 });

      db2.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('um listener do event bus que falha não impede a gravação nem os demais listeners', () => {
    const db = openDatabase({ filePath: ':memory:' });
    runMigrations(db, allMigrations);

    const onListenerError = vi.fn();
    const eventBus = new EventBus(onListenerError);
    const healthyListener = vi.fn();

    eventBus.subscribe(() => {
      throw new Error('listener quebrado de propósito');
    });
    eventBus.subscribe(healthyListener);

    const store = new EventStore(db, eventBus);

    expect(() =>
      store.append({
        type: 'system.started',
        aggregateType: 'system',
        aggregateId: 'x',
        source: { module: 'test' },
        payload: {},
      }),
    ).not.toThrow();

    expect(healthyListener).toHaveBeenCalledTimes(1);
    expect(onListenerError).toHaveBeenCalledTimes(1);
    expect(store.listRecent(10)).toHaveLength(1);

    db.close();
  });
});
