const SENSITIVE_KEY_PATTERN = /(api[_-]?key|token|secret|password|authorization|credential)/i;

/**
 * Retorna uma cópia do objeto com valores de chaves sensíveis substituídos.
 * Última linha de defesa para nunca vazar segredo em log — a fonte da
 * verdade continua sendo nunca colocar o segredo no objeto de log em
 * primeiro lugar.
 */
export function redactSensitiveKeys<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveKeys(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : redactSensitiveKeys(val);
    }
    return result as T;
  }
  return value;
}
