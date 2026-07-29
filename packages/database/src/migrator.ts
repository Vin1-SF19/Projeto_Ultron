import type { SqliteDatabase } from './connection.js';

export interface Migration {
  id: string;
  up: (db: SqliteDatabase) => void;
}

const MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`;

/** Aplica migrations pendentes em ordem, registrando cada uma como aplicada. Idempotente. */
export function runMigrations(db: SqliteDatabase, migrations: Migration[]): { applied: string[] } {
  db.exec(MIGRATIONS_TABLE);

  const alreadyApplied = new Set(
    db
      .prepare('SELECT id FROM schema_migrations')
      .all()
      .map((row) => (row as { id: string }).id),
  );

  const applied: string[] = [];

  for (const migration of migrations) {
    if (alreadyApplied.has(migration.id)) continue;

    db.exec('BEGIN');
    try {
      migration.up(db);
      db.prepare('INSERT INTO schema_migrations (id) VALUES (?)').run(migration.id);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

    applied.push(migration.id);
  }

  return { applied };
}
