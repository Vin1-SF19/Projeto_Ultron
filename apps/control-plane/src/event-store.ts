import { randomUUID } from 'node:crypto';
import type { SqliteDatabase } from '@ultron/database';
import type { DomainEvent } from '@ultron/contracts';
import type { EventBus } from '@ultron/event-bus';

function rowToEvent(row: Record<string, unknown>): DomainEvent {
  return {
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
  };
}

/**
 * Event Store: grava eventos de domínio no SQLite e só então publica no
 * EventBus in-process. A ordem importa — nada é publicado sem antes estar
 * persistido, para que um assinante nunca "veja" um evento que não
 * sobreviveria a um reinício do processo.
 */
export class EventStore {
  constructor(
    private readonly db: SqliteDatabase,
    private readonly eventBus: EventBus,
  ) {}

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

    this.eventBus.publish(event as DomainEvent);

    return event;
  }

  listRecent(limit = 50): DomainEvent[] {
    const rows = this.db
      .prepare('SELECT * FROM events ORDER BY timestamp DESC, id DESC LIMIT ?')
      .all(limit) as Array<Record<string, unknown>>;

    return rows.map(rowToEvent);
  }

  /**
   * Replay incremental: eventos gravados após o evento identificado por `cursor`
   * (exclusive), em ordem cronológica. Usado para reconexão de WebSocket sem
   * reenviar o que o cliente já recebeu.
   */
  listSince(cursor: string, limit = 500): DomainEvent[] {
    const cursorRow = this.db
      .prepare('SELECT timestamp, rowid FROM events WHERE id = ?')
      .get(cursor) as { timestamp: string; rowid: number } | undefined;

    if (!cursorRow) {
      // Cursor desconhecido (ex: banco foi limpo) — tratar como "sem cursor",
      // devolvendo o mais recente em vez de falhar silenciosamente.
      return this.listRecent(limit).reverse();
    }

    const rows = this.db
      .prepare('SELECT * FROM events WHERE rowid > ? ORDER BY rowid ASC LIMIT ?')
      .all(cursorRow.rowid, limit) as Array<Record<string, unknown>>;

    return rows.map(rowToEvent);
  }
}
