import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { SqliteDatabase } from '@ultron/database';
import type { Project } from '@ultron/contracts';

export class InvalidProjectPathError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'InvalidProjectPathError';
  }
}

interface ProjectRow {
  id: string;
  name: string;
  path: string;
  added_at: string;
}

/**
 * Registro de projetos (Fase 5: apenas validação de caminho/permissões e
 * persistência — detecção de Git/stack/scripts é escopo da Fase 9, Project
 * Engine). Nunca escaneia o disco além do caminho explicitamente fornecido
 * pelo usuário (seção 20 do prompt mestre).
 */
export class ProjectStore {
  constructor(private readonly db: SqliteDatabase) {}

  add(input: { path: string; name?: string }): Project {
    const resolvedPath = path.resolve(input.path);

    let stat: fs.Stats;
    try {
      stat = fs.statSync(resolvedPath);
    } catch {
      throw new InvalidProjectPathError(`Caminho não encontrado: ${resolvedPath}`);
    }
    if (!stat.isDirectory()) {
      throw new InvalidProjectPathError(`Caminho não é uma pasta: ${resolvedPath}`);
    }
    try {
      fs.accessSync(resolvedPath, fs.constants.R_OK);
    } catch {
      throw new InvalidProjectPathError(`Sem permissão de leitura: ${resolvedPath}`);
    }

    const project: Project = {
      id: randomUUID(),
      name: input.name ?? path.basename(resolvedPath),
      path: resolvedPath,
      addedAt: new Date().toISOString(),
    };

    try {
      this.db
        .prepare('INSERT INTO projects (id, name, path, added_at) VALUES (@id, @name, @path, @addedAt)')
        .run({ id: project.id, name: project.name, path: project.path, addedAt: project.addedAt });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('UNIQUE')) {
        throw new InvalidProjectPathError(`Este projeto já foi adicionado: ${resolvedPath}`);
      }
      throw error;
    }

    return project;
  }

  list(): Project[] {
    const rows = this.db.prepare('SELECT * FROM projects ORDER BY added_at DESC').all() as unknown as ProjectRow[];
    return rows.map((row) => ({ id: row.id, name: row.name, path: row.path, addedAt: row.added_at }));
  }

  remove(id: string): void {
    this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  }
}
