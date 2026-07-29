export type OpenClawConnectionState =
  | 'disabled'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

export interface OpenClawAdapterConfig {
  /** Se falso/ausente, o adapter nunca tenta conectar (integração opcional, desligada por padrão). */
  enabled: boolean;
  url: string;
  /** Nunca logar este valor — ver redaction em @ultron/security quando existir. */
  token?: string;
}

export interface OpenClawGatewayEvent {
  /** Nome do evento tal como recebido do Gateway (formato interno do OpenClaw, não confiar cegamente). */
  event: string;
  payload: unknown;
  seq?: number;
}
