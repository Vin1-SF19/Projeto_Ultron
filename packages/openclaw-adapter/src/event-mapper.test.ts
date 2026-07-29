import { describe, expect, it } from 'vitest';
import { mapOpenClawEventToDomainEvent } from './event-mapper.js';

describe('mapOpenClawEventToDomainEvent', () => {
  it('traduz um evento do OpenClaw para o envelope DomainEvent do Ultron', () => {
    const domainEvent = mapOpenClawEventToDomainEvent({
      event: 'agent.message',
      payload: { text: 'olá' },
      seq: 42,
    });

    expect(domainEvent.type).toBe('integration.openclaw.agent.message');
    expect(domainEvent.aggregateType).toBe('integration');
    expect(domainEvent.aggregateId).toBe('openclaw');
    expect(domainEvent.source).toEqual({ module: 'openclaw-adapter', integrationId: 'openclaw' });
    expect(domainEvent.payload).toEqual({ text: 'olá' });
    expect(domainEvent.id).toBeTruthy();
    expect(domainEvent.correlationId).toBeTruthy();
  });

  it('reaproveita o correlationId quando fornecido', () => {
    const domainEvent = mapOpenClawEventToDomainEvent(
      { event: 'health', payload: {} },
      'corr-fixo',
    );

    expect(domainEvent.correlationId).toBe('corr-fixo');
  });
});
