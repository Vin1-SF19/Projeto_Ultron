import type { ModelRequest } from '@ultron/contracts';

const SYSTEM_LANGUAGE_INSTRUCTION =
  'Responda sempre em português do Brasil, independentemente do idioma da pergunta, salvo pedido explícito do usuário para usar outro idioma.';

/**
 * Toda mensagem de chat que chega ao RoutingEngine passa por aqui — garante
 * a instrução de idioma sem depender do cliente (desktop, futuro mobile,
 * etc.) lembrar de enviá-la. Não sobrescreve uma mensagem de sistema que o
 * chamador já tenha incluído; apenas adiciona a instrução como a primeira.
 */
export function buildChatMessages(userText: string): ModelRequest['messages'] {
  return [
    { role: 'system', content: SYSTEM_LANGUAGE_INSTRUCTION },
    { role: 'user', content: userText },
  ];
}
