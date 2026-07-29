import type { Migration } from '../migrator.js';

export const migration001EventStore: Migration = {
  id: '001_event_store',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        schema_version INTEGER NOT NULL,
        type TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        aggregate_type TEXT NOT NULL,
        aggregate_id TEXT NOT NULL,
        correlation_id TEXT NOT NULL,
        causation_id TEXT,
        source_module TEXT NOT NULL,
        source_agent_id TEXT,
        source_provider_id TEXT,
        source_integration_id TEXT,
        payload TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
      CREATE INDEX IF NOT EXISTS idx_events_aggregate ON events(aggregate_type, aggregate_id);
      CREATE INDEX IF NOT EXISTS idx_events_correlation ON events(correlation_id);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
    `);
  },
};
