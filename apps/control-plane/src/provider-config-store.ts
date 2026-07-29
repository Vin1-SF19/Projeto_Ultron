import type { SqliteDatabase } from '@ultron/database';
import type { Provider, ProviderKind } from '@ultron/contracts';
import type { SecretStore } from '@ultron/security';

export interface ConfiguredProviderInput {
  name: string;
  kind: ProviderKind;
  baseUrl?: string;
  /** Segredo em texto puro, recebido apenas nesta chamada — nunca persistido em texto plano. */
  apiKey?: string;
}

interface ProviderRow {
  id: string;
  name: string;
  kind: string;
  base_url: string | null;
  secret_ref: string | null;
  enabled: number;
}

function secretRefFor(providerId: string): string {
  return `ultron:provider:${providerId}`;
}

/**
 * Persiste a configuração de providers do usuário: metadados no SQLite,
 * segredo real apenas no keychain do SO via SecretStore (seção 7 do prompt
 * mestre — nunca api_key em texto aberto no banco).
 */
export class ProviderConfigStore {
  constructor(
    private readonly db: SqliteDatabase,
    private readonly secretStore: SecretStore,
  ) {}

  async upsert(input: ConfiguredProviderInput): Promise<Provider> {
    const id = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const secretRef = input.apiKey ? secretRefFor(id) : null;

    if (input.apiKey && secretRef) {
      await this.secretStore.set(secretRef, input.apiKey);
    }

    this.db
      .prepare(
        `INSERT INTO providers (id, name, kind, base_url, secret_ref, enabled, updated_at)
         VALUES (@id, @name, @kind, @base_url, @secret_ref, 1, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           kind = excluded.kind,
           base_url = excluded.base_url,
           secret_ref = COALESCE(excluded.secret_ref, providers.secret_ref),
           updated_at = datetime('now')`,
      )
      .run({
        id,
        name: input.name,
        kind: input.kind,
        base_url: input.baseUrl ?? null,
        secret_ref: secretRef,
      });

    return { id, name: input.name, kind: input.kind, baseUrl: input.baseUrl, credentialRef: secretRef ?? undefined, enabled: true };
  }

  list(): Provider[] {
    const rows = this.db.prepare('SELECT * FROM providers WHERE enabled = 1').all() as unknown as ProviderRow[];
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      kind: row.kind as ProviderKind,
      baseUrl: row.base_url ?? undefined,
      credentialRef: row.secret_ref ?? undefined,
      enabled: Boolean(row.enabled),
    }));
  }

  async getApiKey(providerId: string): Promise<string | undefined> {
    return this.secretStore.get(secretRefFor(providerId));
  }

  async remove(providerId: string): Promise<void> {
    await this.secretStore.delete(secretRefFor(providerId));
    this.db.prepare('DELETE FROM providers WHERE id = ?').run(providerId);
  }
}
