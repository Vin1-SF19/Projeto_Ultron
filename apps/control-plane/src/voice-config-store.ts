import type { SqliteDatabase } from '@ultron/database';
import type { VoiceConfig } from '@ultron/contracts';
import type { SecretStore } from '@ultron/security';

const SECRET_REF = 'ultron:voice:elevenlabs';

interface VoiceConfigRow {
  id: number;
  secret_ref: string | null;
  voice_id: string | null;
  voice_name: string | null;
}

export interface ConfigureVoiceInput {
  apiKey: string;
  voiceId: string;
  voiceName: string;
}

/**
 * Persiste a configuração de voz (ElevenLabs): metadados no SQLite, a
 * apiKey apenas no keychain do SO via SecretStore — mesmo padrão do
 * ProviderConfigStore (seção 7 do prompt mestre, nunca segredo em texto
 * plano no banco).
 */
export class VoiceConfigStore {
  constructor(
    private readonly db: SqliteDatabase,
    private readonly secretStore: SecretStore,
  ) {}

  async configure(input: ConfigureVoiceInput): Promise<VoiceConfig> {
    await this.secretStore.set(SECRET_REF, input.apiKey);

    this.db
      .prepare(
        `INSERT INTO voice_config (id, secret_ref, voice_id, voice_name, updated_at)
         VALUES (1, @secret_ref, @voice_id, @voice_name, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           secret_ref = excluded.secret_ref,
           voice_id = excluded.voice_id,
           voice_name = excluded.voice_name,
           updated_at = datetime('now')`,
      )
      .run({ secret_ref: SECRET_REF, voice_id: input.voiceId, voice_name: input.voiceName });

    return { configured: true, voiceId: input.voiceId, voiceName: input.voiceName };
  }

  get(): VoiceConfig {
    const row = this.db.prepare('SELECT * FROM voice_config WHERE id = 1').get() as unknown as
      | VoiceConfigRow
      | undefined;
    if (!row || !row.secret_ref) {
      return { configured: false };
    }
    return { configured: true, voiceId: row.voice_id ?? undefined, voiceName: row.voice_name ?? undefined };
  }

  async getApiKey(): Promise<string | undefined> {
    return this.secretStore.get(SECRET_REF);
  }

  async remove(): Promise<void> {
    await this.secretStore.delete(SECRET_REF);
    this.db.prepare('DELETE FROM voice_config WHERE id = 1').run();
  }
}
