import type { Migration } from '../migrator.js';

export const migration004AutonomyConfig: Migration = {
  id: '004_autonomy_config',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS autonomy_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        level TEXT NOT NULL DEFAULT 'observation',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS bounded_autonomy_rules (
        id TEXT PRIMARY KEY,
        action_type TEXT NOT NULL,
        scope TEXT,
        project_id TEXT,
        expires_at TEXT,
        max_budget REAL,
        max_actions INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT OR IGNORE INTO autonomy_config (id, level) VALUES (1, 'observation');
    `);
  },
};
