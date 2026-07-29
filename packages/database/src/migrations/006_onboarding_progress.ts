import type { Migration } from '../migrator.js';

export const migration006OnboardingProgress: Migration = {
  id: '006_onboarding_progress',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS onboarding_progress (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        current_step TEXT NOT NULL DEFAULT 'welcome',
        completed_steps TEXT NOT NULL DEFAULT '[]',
        completed_at TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT OR IGNORE INTO onboarding_progress (id, current_step) VALUES (1, 'welcome');
    `);
  },
};
