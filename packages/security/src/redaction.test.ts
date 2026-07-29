import { describe, expect, it } from 'vitest';
import { redactSensitiveKeys } from './redaction.js';

describe('redactSensitiveKeys', () => {
  it('redige chaves sensíveis em qualquer profundidade', () => {
    const input = {
      provider: 'openai',
      apiKey: 'sk-super-secreto',
      nested: { token: 'abc123', label: 'ok' },
    };

    const result = redactSensitiveKeys(input) as typeof input;

    expect(result.apiKey).toBe('[REDACTED]');
    expect(result.nested.token).toBe('[REDACTED]');
    expect(result.nested.label).toBe('ok');
    expect(result.provider).toBe('openai');
  });

  it('redige dentro de arrays', () => {
    const input = [{ password: 'senha123' }, { name: 'ok' }];

    const result = redactSensitiveKeys(input) as typeof input;

    expect(result[0]?.password).toBe('[REDACTED]');
    expect(result[1]?.name).toBe('ok');
  });

  it('não altera valores primitivos', () => {
    expect(redactSensitiveKeys('texto simples')).toBe('texto simples');
    expect(redactSensitiveKeys(42)).toBe(42);
    expect(redactSensitiveKeys(null)).toBe(null);
  });
});
