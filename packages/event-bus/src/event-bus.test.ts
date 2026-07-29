import { describe, expect, it, vi } from 'vitest';
import type { DomainEvent } from '@ultron/contracts';
import { EventBus } from './event-bus.js';

function makeEvent(type: string): DomainEvent {
  return {
    id: `evt_${type}`,
    schemaVersion: 1,
    type,
    timestamp: new Date().toISOString(),
    aggregateType: 'system',
    aggregateId: 'ultron-control-plane',
    correlationId: 'corr_1',
    source: { module: 'test' },
    payload: {},
  };
}

describe('EventBus', () => {
  it('entrega evento para assinante sem filtro', () => {
    const bus = new EventBus();
    const listener = vi.fn();
    bus.subscribe(listener);

    bus.publish(makeEvent('system.started'));

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('filtra por tipo exato', () => {
    const bus = new EventBus();
    const listener = vi.fn();
    bus.subscribe(listener, 'system.started');

    bus.publish(makeEvent('system.stopped'));
    expect(listener).not.toHaveBeenCalled();

    bus.publish(makeEvent('system.started'));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('filtra por prefixo com wildcard', () => {
    const bus = new EventBus();
    const listener = vi.fn();
    bus.subscribe(listener, 'system.*');

    bus.publish(makeEvent('system.started'));
    bus.publish(makeEvent('task.created'));

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe remove o listener', () => {
    const bus = new EventBus();
    const listener = vi.fn();
    const unsubscribe = bus.subscribe(listener);

    unsubscribe();
    bus.publish(makeEvent('system.started'));

    expect(listener).not.toHaveBeenCalled();
  });

  it('erro em um listener não impede os demais de receberem o evento', () => {
    const bus = new EventBus();
    const failing = vi.fn(() => {
      throw new Error('falha proposital');
    });
    const healthy = vi.fn();
    const onError = vi.fn();

    const busWithHandler = new EventBus(onError);
    busWithHandler.subscribe(failing);
    busWithHandler.subscribe(healthy);

    busWithHandler.publish(makeEvent('system.started'));

    expect(healthy).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(bus).toBeDefined();
  });

  it('sem handler de erro configurado, o erro do listener propaga', () => {
    const bus = new EventBus();
    bus.subscribe(() => {
      throw new Error('falha sem handler');
    });

    expect(() => bus.publish(makeEvent('system.started'))).toThrow('falha sem handler');
  });
});
