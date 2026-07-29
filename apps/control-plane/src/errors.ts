/**
 * Erro de domínio do Control Plane. Toda falha esperada (validação, recurso
 * não encontrado, etc.) deve ser lançada como UltronError para que o handler
 * de erro produza um envelope JSON consistente — nunca uma mensagem genérica
 * como "Algo deu errado" (seção 9.1 do prompt mestre).
 */
export class UltronError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'UltronError';
  }
}

export interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    correlationId: string;
    details?: unknown;
  };
}

export function toErrorResponseBody(input: {
  code: string;
  message: string;
  correlationId: string;
  details?: unknown;
}): ErrorResponseBody {
  return {
    error: {
      code: input.code,
      message: input.message,
      correlationId: input.correlationId,
      details: input.details,
    },
  };
}
