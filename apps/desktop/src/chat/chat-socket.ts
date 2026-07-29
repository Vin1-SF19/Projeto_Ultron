const CONTROL_PLANE_WS_URL = 'ws://127.0.0.1:4577/ws';

export interface ModelResponseSummary {
  decision: { profileId: string; providerId: string; modelId: string; reason: string; fallbackUsed: boolean };
  content: string;
  latencyMs: number;
  tokensIn?: number;
  tokensOut?: number;
}

export type ChatSocketStatus = 'connecting' | 'open' | 'closed';

interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (response: ModelResponseSummary) => void;
  onError: (message: string) => void;
}

/**
 * Cliente do WebSocket /ws do Control Plane, focado no protocolo de
 * streaming de modelo (model_stream_*). Mensagens de outro `kind` (replay,
 * event) são ignoradas aqui deliberadamente — quem cuida delas é o
 * consumidor de eventos gerais (rosto/atividade), não o chat.
 */
export class ChatSocket {
  private socket: WebSocket | undefined;
  private status: ChatSocketStatus = 'closed';
  private readonly pending = new Map<string, StreamCallbacks>();
  private readonly statusListeners = new Set<(status: ChatSocketStatus) => void>();

  connect(): void {
    if (this.socket && this.status !== 'closed') return;

    this.status = 'connecting';
    this.notifyStatus();
    const socket = new WebSocket(CONTROL_PLANE_WS_URL);
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.status = 'open';
      this.notifyStatus();
    });

    socket.addEventListener('close', () => {
      this.status = 'closed';
      this.notifyStatus();
    });

    socket.addEventListener('error', () => {
      this.status = 'closed';
      this.notifyStatus();
    });

    socket.addEventListener('message', (event) => {
      this.handleMessage(event.data as string);
    });
  }

  private handleMessage(raw: string): void {
    let message: { kind?: string; requestId?: string; token?: string; response?: ModelResponseSummary; message?: string };
    try {
      message = JSON.parse(raw) as typeof message;
    } catch {
      return;
    }

    if (!message.requestId) return;
    const callbacks = this.pending.get(message.requestId);
    if (!callbacks) return;

    if (message.kind === 'model_stream_token' && typeof message.token === 'string') {
      callbacks.onToken(message.token);
    } else if (message.kind === 'model_stream_done' && message.response) {
      this.pending.delete(message.requestId);
      callbacks.onDone(message.response);
    } else if (message.kind === 'model_stream_error') {
      this.pending.delete(message.requestId);
      callbacks.onError(message.message ?? 'Erro desconhecido no streaming.');
    }
  }

  onStatusChange(listener: (status: ChatSocketStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private notifyStatus(): void {
    for (const listener of this.statusListeners) listener(this.status);
  }

  getStatus(): ChatSocketStatus {
    return this.status;
  }

  sendMessage(requestId: string, profileId: string, text: string, callbacks: StreamCallbacks): void {
    if (!this.socket || this.status !== 'open') {
      callbacks.onError('Control Plane não está conectado.');
      return;
    }
    this.pending.set(requestId, callbacks);
    this.socket.send(JSON.stringify({ kind: 'model_stream_start', requestId, profileId, text }));
  }

  cancel(requestId: string): void {
    if (!this.socket || this.status !== 'open') return;
    this.pending.delete(requestId);
    this.socket.send(JSON.stringify({ kind: 'model_stream_cancel', requestId }));
  }

  close(): void {
    this.socket?.close();
    this.socket = undefined;
    this.status = 'closed';
  }
}
