import { describe, expect, it, vi } from 'vitest';

const setPassword = vi.fn().mockResolvedValue(undefined);
const getPassword = vi.fn().mockResolvedValue('valor-secreto');
const deletePassword = vi.fn().mockResolvedValue(true);

vi.mock('@napi-rs/keyring', () => ({
  AsyncEntry: vi.fn().mockImplementation((service: string, username: string) => ({
    service,
    username,
    setPassword,
    getPassword,
    deletePassword,
  })),
}));

const { SecretStore } = await import('./secret-store.js');

describe('SecretStore', () => {
  it('set() grava a senha usando o secret_ref como username', async () => {
    const store = new SecretStore();
    await store.set('ultron:provider:ollama-remote', 'token-real');

    expect(setPassword).toHaveBeenCalledWith('token-real');
  });

  it('get() retorna o valor salvo', async () => {
    const store = new SecretStore();
    const value = await store.get('ultron:provider:ollama-remote');

    expect(value).toBe('valor-secreto');
  });

  it('delete() retorna true quando a credencial existia', async () => {
    const store = new SecretStore();
    const deleted = await store.delete('ultron:provider:ollama-remote');

    expect(deleted).toBe(true);
  });
});
