import { createRequire } from 'node:module';

// Import via createRequire (em vez de `import ... from 'node:sqlite'`) porque o
// Vite 5.4.x (usado pelo Vitest) não reconhece "node:sqlite" — um builtin
// experimental do Node 22+ que não está listado em node:module.builtinModules —
// e tenta resolvê-lo incorretamente como pacote npm, quebrando o pipeline de
// transform. createRequire contorna completamente a resolução de módulos do Vite.
const nodeRequire = createRequire(import.meta.url);
const { DatabaseSync } = nodeRequire('node:sqlite') as typeof import('node:sqlite');

export interface UltronDatabaseOptions {
  /** Caminho do arquivo SQLite. Use ":memory:" para testes. */
  filePath: string;
  busyTimeoutMs?: number;
}

export type SqliteDatabase = import('node:sqlite').DatabaseSync;

export function openDatabase(options: UltronDatabaseOptions): SqliteDatabase {
  const db = new DatabaseSync(options.filePath);

  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`PRAGMA busy_timeout = ${options.busyTimeoutMs ?? 5000}`);

  return db;
}
