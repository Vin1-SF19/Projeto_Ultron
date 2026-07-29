import { describe, expect, it } from 'vitest';
import { autonomyConfigSchema, boundedAutonomyRuleSchema } from './approval.js';

describe('approval schemas', () => {
  it('aceita configuração de autonomia observação sem regras', () => {
    expect(() => autonomyConfigSchema.parse({ level: 'observation', boundedRules: [] })).not.toThrow();
  });

  it('aplica default de boundedRules vazio quando omitido', () => {
    const parsed = autonomyConfigSchema.parse({ level: 'assistance' });
    expect(parsed.boundedRules).toEqual([]);
  });

  it('rejeita nível de autonomia inválido', () => {
    expect(() => autonomyConfigSchema.parse({ level: 'onipotente' })).toThrow();
  });

  it('aceita regra de autonomia delimitada completa', () => {
    const rule = {
      id: 'rule-1',
      actionType: 'send_email',
      scope: 'projeto-x',
      maxBudget: 50,
      maxActions: 10,
    };
    expect(() => boundedAutonomyRuleSchema.parse(rule)).not.toThrow();
  });
});
