import type { Migration } from '../migrator.js';

export const migration005Projects: Migration = {
  id: '005_projects',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        added_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  },
};
