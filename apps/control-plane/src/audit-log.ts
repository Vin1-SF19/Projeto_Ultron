import { randomUUID } from 'node:crypto';
import type { SqliteDatabase } from '@ultron/database';

export type ActorType = 'user' | 'agent' | 'system';
export type AuditOutcome = 'success' | 'failure';

export interface AuditEntry {
  correlationId: string;
  actorType: ActorType;
  actorId?: string;
  action: string;
  outcome: AuditOutcome;
  targetType?: string;
  targetId?: string;
  details?: unknown;
}

/**
 * Audit Engine: registro distinto do Event Store, focado em "quem fez o quê,
 * quando, e com que resultado" — nunca confundir ação de agente com ação
 * pessoal do usuário sem identificação explícita (seção 30 do prompt mestre).
 */
export class AuditLog {
  constructor(private readonly db: SqliteDatabase) {}

  record(entry: AuditEntry): void {
    this.db
      .prepare(
        `INSERT INTO audit_events (id, timestamp, correlation_id, actor_type, actor_id, action, outcome, target_type, target_id, details)
         VALUES (@id, @timestamp, @correlation_id, @actor_type, @actor_id, @action, @outcome, @target_type, @target_id, @details)`,
      )
      .run({
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        correlation_id: entry.correlationId,
        actor_type: entry.actorType,
        actor_id: entry.actorId ?? null,
        action: entry.action,
        outcome: entry.outcome,
        target_type: entry.targetType ?? null,
        target_id: entry.targetId ?? null,
        details: entry.details !== undefined ? JSON.stringify(entry.details) : null,
      });
  }

  listRecent(limit = 100): Array<AuditEntry & { id: string; timestamp: string }> {
    const rows = this.db
      .prepare('SELECT * FROM audit_events ORDER BY timestamp DESC LIMIT ?')
      .all(limit) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: row.id as string,
      timestamp: row.timestamp as string,
      correlationId: row.correlation_id as string,
      actorType: row.actor_type as ActorType,
      actorId: (row.actor_id as string | null) ?? undefined,
      action: row.action as string,
      outcome: row.outcome as AuditOutcome,
      targetType: (row.target_type as string | null) ?? undefined,
      targetId: (row.target_id as string | null) ?? undefined,
      details: row.details ? (JSON.parse(row.details as string) as unknown) : undefined,
    }));
  }
}
