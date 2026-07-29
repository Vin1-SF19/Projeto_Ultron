import { describe, expect, it } from 'vitest';
import { buildChatMessages } from './chat-messages.js';

describe('buildChatMessages', () => {
  it('inclui uma mensagem de sistema pedindo resposta em português do Brasil antes da mensagem do usuário', () => {
    const messages = buildChatMessages('what is the capital of france?');

    expect(messages[0]).toMatchObject({ role: 'system' });
    expect(messages[0]?.content).toContain('português do Brasil');
    expect(messages[1]).toEqual({ role: 'user', content: 'what is the capital of france?' });
  });

  it('sempre inclui a instrução de idioma mesmo quando o usuário já escreve em português', () => {
    const messages = buildChatMessages('qual a capital da frança?');

    expect(messages[0]?.role).toBe('system');
    expect(messages).toHaveLength(2);
  });
});
