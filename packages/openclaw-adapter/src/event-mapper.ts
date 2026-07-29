import { randomUUID } from 'node:crypto';
import type { DomainEvent } from '@ultron/contracts';
import type { OpenClawGatewayEvent } from './types.js';

/**
 * Camada anticorrupção (ADR-003): traduz o formato interno/proprietário do
 * OpenClaw Gateway para o envelope DomainEvent do Ultron. Nenhuma camada
 * acima deste módulo deve conhecer o formato bruto do OpenClaw.
 */
export function mapOpenClawEventToDomainEvent(
  gatewayEvent: OpenClawGatewayEvent,
  correlationId?: string,
): DomainEvent {
  return {
    id: randomUUID(),
    schemaVersion: 1,
    type: `integration.openclaw.${gatewayEvent.event}`,
    timestamp: new Date().toISOString(),
    aggregateType: 'integration',
    aggregateId: 'openclaw',
    correlationId: correlationId ?? randomUUID(),
    source: { module: 'openclaw-adapter', integrationId: 'openclaw' },
    payload: gatewayEvent.payload,
  };
}
