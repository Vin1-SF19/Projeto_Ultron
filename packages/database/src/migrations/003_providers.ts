import type { Migration } from '../migrator.js';

export const migration003Providers: Migration = {
  id: '003_providers',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS providers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        base_url TEXT,
        secret_ref TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_providers_enabled ON providers(enabled);
    `);
  },
};
