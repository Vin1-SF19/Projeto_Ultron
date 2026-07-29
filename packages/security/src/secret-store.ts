import { AsyncEntry } from '@napi-rs/keyring';

const SERVICE_NAME = 'Ultron';

/**
 * Acesso ao keychain nativo do SO (Windows Credential Manager, macOS Keychain,
 * Linux Secret Service) via @napi-rs/keyring (ADR-010). O SQLite nunca guarda
 * o valor do segredo — apenas o secret_ref (a mesma string usada como
 * "username" da entrada aqui).
 */
export class SecretStore {
  async set(secretRef: string, value: string): Promise<void> {
    const entry = new AsyncEntry(SERVICE_NAME, secretRef);
    await entry.setPassword(value);
  }

  async get(secretRef: string): Promise<string | undefined> {
    const entry = new AsyncEntry(SERVICE_NAME, secretRef);
    // O binding nativo pode retornar null quando não há credencial; normalizamos
    // para undefined para manter uma única representação de "ausente".
    const value = await entry.getPassword();
    return value ?? undefined;
  }

  async delete(secretRef: string): Promise<boolean> {
    const entry = new AsyncEntry(SERVICE_NAME, secretRef);
    return Boolean(await entry.deletePassword());
  }
}
