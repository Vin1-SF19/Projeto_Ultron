import { describe, expect, it } from 'vitest';
import { domainEventSchema } from './domain-event.js';

describe('domainEventSchema', () => {
  it('aceita um evento de domínio válido', () => {
    const event = {
      id: 'evt_1',
      schemaVersion: 1,
      type: 'system.started',
      timestamp: new Date().toISOString(),
      aggregateType: 'system',
      aggregateId: 'ultron-control-plane',
      correlationId: 'corr_1',
      source: { module: 'control-plane' },
      payload: { pid: 1234 },
    };

    expect(() => domainEventSchema.parse(event)).not.toThrow();
  });

  it('rejeita evento sem correlationId', () => {
    const event = {
      id: 'evt_1',
      schemaVersion: 1,
      type: 'system.started',
      timestamp: new Date().toISOString(),
      aggregateType: 'system',
      aggregateId: 'ultron-control-plane',
      source: { module: 'control-plane' },
      payload: {},
    };

    expect(() => domainEventSchema.parse(event)).toThrow();
  });
});
