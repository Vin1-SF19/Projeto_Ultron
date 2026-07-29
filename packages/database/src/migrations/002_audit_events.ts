import type { Migration } from '../migrator.js';

export const migration002AuditEvents: Migration = {
  id: '002_audit_events',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        correlation_id TEXT NOT NULL,
        actor_type TEXT NOT NULL,
        actor_id TEXT,
        action TEXT NOT NULL,
        outcome TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        details TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_events_correlation ON audit_events(correlation_id);
      CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action);
    `);
  },
};
