import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatSocket } from './chat-socket.js';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  listeners = new Map<string, Array<(event: unknown) => void>>();
  sent: string[] = [];
  closed = false;

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: (event: unknown) => void) {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.closed = true;
    this.emit('close', {});
  }

  emit(type: string, event: unknown) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  emitOpen() {
    this.emit('open', {});
  }

  emitMessage(data: unknown) {
    this.emit('message', { data: JSON.stringify(data) });
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakeWebSocket.instances = [];
});

describe('ChatSocket', () => {
  it('conecta, reporta status open, e envia model_stream_start no formato correto', () => {
    vi.stubGlobal('WebSocket', FakeWebSocket);
    const chatSocket = new ChatSocket();
    const statuses: string[] = [];
    chatSocket.onStatusChange((s) => statuses.push(s));

    chatSocket.connect();
    expect(statuses).toEqual(['connecting']);

    const ws = FakeWebSocket.instances[0]!;
    ws.emitOpen();
    expect(statuses).toEqual(['connecting', 'open']);

    chatSocket.sendMessage('req-1', 'chat-fast', 'oi', { onToken: vi.fn(), onDone: vi.fn(), onError: vi.fn() });

    expect(JSON.parse(ws.sent[0]!)).toEqual({
      kind: 'model_stream_start',
      requestId: 'req-1',
      profileId: 'chat-fast',
      text: 'oi',
    });
  });

  it('roteia model_stream_token e model_stream_done para os callbacks do requestId correto', () => {
    vi.stubGlobal('WebSocket', FakeWebSocket);
    const chatSocket = new ChatSocket();
    chatSocket.connect();
    const ws = FakeWebSocket.instances[0]!;
    ws.emitOpen();

    const onToken = vi.fn();
    const onDone = vi.fn();
    chatSocket.sendMessage('req-1', 'chat-fast', 'oi', { onToken, onDone, onError: vi.fn() });

    ws.emitMessage({ kind: 'model_stream_token', requestId: 'req-1', token: 'olá' });
    ws.emitMessage({ kind: 'model_stream_token', requestId: 'req-1', token: ' mundo' });
    expect(onToken).toHaveBeenNthCalledWith(1, 'olá');
    expect(onToken).toHaveBeenNthCalledWith(2, ' mundo');

    const response = { decision: { profileId: 'chat-fast', providerId: 'ollama', modelId: 'm', reason: '', fallbackUsed: false }, content: 'olá mundo', latencyMs: 1 };
    ws.emitMessage({ kind: 'model_stream_done', requestId: 'req-1', response });
    expect(onDone).toHaveBeenCalledWith(response);
  });

  it('ignora mensagens de um requestId desconhecido ou já finalizado', () => {
    vi.stubGlobal('WebSocket', FakeWebSocket);
    const chatSocket = new ChatSocket();
    chatSocket.connect();
    const ws = FakeWebSocket.instances[0]!;
    ws.emitOpen();

    const onToken = vi.fn();
    chatSocket.sendMessage('req-1', 'chat-fast', 'oi', { onToken, onDone: vi.fn(), onError: vi.fn() });

    ws.emitMessage({ kind: 'model_stream_token', requestId: 'req-nao-existe', token: 'x' });
    expect(onToken).not.toHaveBeenCalled();
  });

  it('roteia model_stream_error e não chama onDone depois', () => {
    vi.stubGlobal('WebSocket', FakeWebSocket);
    const chatSocket = new ChatSocket();
    chatSocket.connect();
    const ws = FakeWebSocket.instances[0]!;
    ws.emitOpen();

    const onError = vi.fn();
    const onDone = vi.fn();
    chatSocket.sendMessage('req-1', 'chat-fast', 'oi', { onToken: vi.fn(), onDone, onError });

    ws.emitMessage({ kind: 'model_stream_error', requestId: 'req-1', message: 'provider indisponível' });
    expect(onError).toHaveBeenCalledWith('provider indisponível');

    ws.emitMessage({ kind: 'model_stream_done', requestId: 'req-1', response: {} });
    expect(onDone).not.toHaveBeenCalled();
  });

  it('sendMessage chama onError imediatamente se o socket não estiver aberto', () => {
    vi.stubGlobal('WebSocket', FakeWebSocket);
    const chatSocket = new ChatSocket();
    const onError = vi.fn();

    chatSocket.sendMessage('req-1', 'chat-fast', 'oi', { onToken: vi.fn(), onDone: vi.fn(), onError });

    expect(onError).toHaveBeenCalledWith(expect.stringContaining('não está conectado'));
  });
});
