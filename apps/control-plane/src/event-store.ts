import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { DomainEvent } from '@ultron/contracts';

export type EventListener = (event: DomainEvent) => void;

/**
 * Event Store mínimo: persiste eventos de domínio no SQLite e notifica listeners
 * inscritos (a base para o Event Bus / WebSocket interno).
 */
export class EventStore {
  private readonly listeners = new Set<EventListener>();

  constructor(private readonly db: DatabaseSync) {}

  append<TPayload>(input: {
    type: string;
    aggregateType: string;
    aggregateId: string;
    correlationId?: string;
    causationId?: string;
    source: DomainEvent['source'];
    payload: TPayload;
  }): DomainEvent<TPayload> {
    const event: DomainEvent<TPayload> = {
      id: randomUUID(),
      schemaVersion: 1,
      type: input.type,
      timestamp: new Date().toISOString(),
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      correlationId: input.correlationId ?? randomUUID(),
      causationId: input.causationId,
      source: input.source,
      payload: input.payload,
    };

    this.db
      .prepare(
        `INSERT INTO events (id, schema_version, type, timestamp, aggregate_type, aggregate_id, correlation_id, causation_id, source_module, source_agent_id, source_provider_id, source_integration_id, payload)
         VALUES (@id, @schema_version, @type, @timestamp, @aggregate_type, @aggregate_id, @correlation_id, @causation_id, @source_module, @source_agent_id, @source_provider_id, @source_integration_id, @payload)`,
      )
      .run({
        id: event.id,
        schema_version: event.schemaVersion,
        type: event.type,
        timestamp: event.timestamp,
        aggregate_type: event.aggregateType,
        aggregate_id: event.aggregateId,
        correlation_id: event.correlationId,
        causation_id: event.causationId ?? null,
        source_module: event.source.module,
        source_agent_id: event.source.agentId ?? null,
        source_provider_id: event.source.providerId ?? null,
        source_integration_id: event.source.integrationId ?? null,
        payload: JSON.stringify(event.payload),
      });

    for (const listener of this.listeners) {
      listener(event as DomainEvent);
    }

    return event;
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  listRecent(limit = 50): DomainEvent[] {
    const rows = this.db
      .prepare('SELECT * FROM events ORDER BY timestamp DESC LIMIT ?')
      .all(limit) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: row.id as string,
      schemaVersion: row.schema_version as number,
      type: row.type as string,
      timestamp: row.timestamp as string,
      aggregateType: row.aggregate_type as string,
      aggregateId: row.aggregate_id as string,
      correlationId: row.correlation_id as string,
      causationId: (row.causation_id as string | null) ?? undefined,
      source: {
        module: row.source_module as string,
        agentId: (row.source_agent_id as string | null) ?? undefined,
        providerId: (row.source_provider_id as string | null) ?? undefined,
        integrationId: (row.source_integration_id as string | null) ?? undefined,
      },
      payload: JSON.parse(row.payload as string) as unknown,
    }));
  }
}
