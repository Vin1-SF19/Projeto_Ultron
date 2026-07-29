import type { Migration } from '../migrator.js';

export const migration007VoiceConfig: Migration = {
  id: '007_voice_config',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS voice_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        secret_ref TEXT,
        voice_id TEXT,
        voice_name TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  },
};
