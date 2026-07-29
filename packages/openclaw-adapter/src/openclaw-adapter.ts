import { GatewayClient } from '@openclaw/gateway-client';
import { GATEWAY_CLIENT_IDS } from '@openclaw/gateway-protocol/client-info';
import type { DomainEvent } from '@ultron/contracts';
import { mapOpenClawEventToDomainEvent } from './event-mapper.js';
import type { OpenClawAdapterConfig, OpenClawConnectionState } from './types.js';

export interface OpenClawAdapterDeps {
  onDomainEvent: (event: DomainEvent) => void;
  onStateChange?: (state: OpenClawConnectionState) => void;
  logInfo?: (message: string, meta?: Record<string, unknown>) => void;
  logError?: (message: string, meta?: Record<string, unknown>) => void;
}

/**
 * Adapter para o OpenClaw Gateway (ADR-003, ADR-007). Usa o SDK oficial
 * @openclaw/gateway-client. Nunca conecta automaticamente sem configuração
 * explícita (integração opcional, desligada por padrão — seção 34 do prompt
 * mestre). Nunca loga o token de autenticação.
 */
export class OpenClawAdapter {
  private client: GatewayClient | undefined;
  private state: OpenClawConnectionState = 'disabled';

  constructor(
    private readonly config: OpenClawAdapterConfig,
    private readonly deps: OpenClawAdapterDeps,
  ) {}

  getState(): OpenClawConnectionState {
    return this.state;
  }

  private setState(next: OpenClawConnectionState) {
    this.state = next;
    this.deps.onStateChange?.(next);
  }

  connect(): void {
    if (!this.config.enabled) {
      this.deps.logInfo?.('OpenClaw desabilitado — não conectando (integração opcional)');
      return;
    }
    if (this.client) {
      this.deps.logInfo?.('OpenClawAdapter já conectado/conectando — ignorando novo connect()');
      return;
    }

    this.setState('connecting');

    this.client = new GatewayClient({
      url: this.config.url,
      token: this.config.token,
      clientName: GATEWAY_CLIENT_IDS.NODE_HOST,
      clientVersion: '0.1.0',
      minProtocol: 4,
      maxProtocol: 4,
      onHelloOk: () => {
        this.setState('connected');
        this.deps.logInfo?.('OpenClaw Gateway conectado');
      },
      onConnectError: (error) => {
        this.setState('error');
        // Nunca logar `error` bruto se ele puder conter o token — mensagens do
        // SDK são de erro de protocolo, não deveriam incluir segredos, mas
        // por cautela extraímos apenas a mensagem.
        this.deps.logError?.('falha ao conectar ao OpenClaw Gateway', { message: error.message });
      },
      onClose: (code, reason) => {
        this.setState('disconnected');
        this.deps.logInfo?.('conexão com OpenClaw Gateway encerrada', { code, reason });
      },
      onReconnectPaused: (info) => {
        this.setState('reconnecting');
        this.deps.logInfo?.('reconexão com OpenClaw Gateway pausada', info);
      },
      onEvent: (frame) => {
        const domainEvent = mapOpenClawEventToDomainEvent({
          event: frame.event,
          payload: frame.payload,
          seq: frame.seq,
        });
        this.deps.onDomainEvent(domainEvent);
      },
    });

    this.client.start();
  }

  async health(): Promise<{ ok: boolean; detail?: unknown }> {
    if (!this.client || this.state !== 'connected') {
      return { ok: false, detail: `estado atual: ${this.state}` };
    }
    try {
      const result = await this.client.request('status', {});
      return { ok: true, detail: result };
    } catch (error) {
      return { ok: false, detail: error instanceof Error ? error.message : String(error) };
    }
  }

  disconnect(): void {
    this.client?.stop();
    this.client = undefined;
    this.setState('disabled');
  }
}
