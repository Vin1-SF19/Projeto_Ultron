import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from './ChatPanel.js';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  listeners = new Map<string, Array<(event: unknown) => void>>();
  sent: string[] = [];

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

beforeEach(() => {
  // Por padrão, /api/v1/voice/speak responde "não configurada" — cenário mais
  // comum antes do usuário configurar uma voz. Testes específicos de voz
  // sobrescrevem este mock.
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: { code: 'voice_not_configured' } }),
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  FakeWebSocket.instances = [];
});

describe('ChatPanel', () => {
  it('mostra aviso de desconectado antes do socket abrir e desabilita o composer', () => {
    vi.stubGlobal('WebSocket', FakeWebSocket);
    render(<ChatPanel />);

    expect(screen.getByRole('status').textContent).toMatch(/reconectando/i);
    expect(screen.getByRole('textbox').hasAttribute('disabled')).toBe(true);
  });

  it('envia mensagem, recebe tokens incrementalmente e finaliza com metadados do provider', async () => {
    vi.stubGlobal('WebSocket', FakeWebSocket);
    const user = userEvent.setup();
    render(<ChatPanel />);

    const ws = FakeWebSocket.instances[0]!;
    ws.emitOpen();

    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'oi tudo bem?');
    await user.click(screen.getByRole('button', { name: /enviar/i }));

    expect(screen.getByText('oi tudo bem?')).toBeDefined();

    const sentMessage = JSON.parse(ws.sent[0]!) as { kind: string; requestId: string; profileId: string; text: string };
    expect(sentMessage.kind).toBe('model_stream_start');
    expect(sentMessage.profileId).toBe('chat-fast');
    expect(sentMessage.text).toBe('oi tudo bem?');

    ws.emitMessage({ kind: 'model_stream_token', requestId: sentMessage.requestId, token: 'olá' });
    ws.emitMessage({ kind: 'model_stream_token', requestId: sentMessage.requestId, token: ' mundo' });

    await waitFor(() => expect(screen.getByText(/olá mundo/)).toBeDefined());

    ws.emitMessage({
      kind: 'model_stream_done',
      requestId: sentMessage.requestId,
      response: {
        decision: { profileId: 'chat-fast', providerId: 'ollama', modelId: 'llama3.2:1b', reason: '', fallbackUsed: false },
        content: 'olá mundo',
        latencyMs: 5,
      },
    });

    await waitFor(() => expect(screen.getByText(/ollama · llama3.2:1b/)).toBeDefined());
  });

  it('mostra erro na mensagem quando o streaming falha', async () => {
    vi.stubGlobal('WebSocket', FakeWebSocket);
    const user = userEvent.setup();
    render(<ChatPanel />);

    const ws = FakeWebSocket.instances[0]!;
    ws.emitOpen();
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());

    await user.type(screen.getByRole('textbox'), 'oi');
    await user.click(screen.getByRole('button', { name: /enviar/i }));

    const sentMessage = JSON.parse(ws.sent[0]!) as { requestId: string };
    ws.emitMessage({ kind: 'model_stream_error', requestId: sentMessage.requestId, message: 'provider indisponível' });

    await waitFor(() => expect(screen.getByText(/provider indisponível/)).toBeDefined());
  });

  it('dispara onFaceEvent com os tipos de evento corretos durante o ciclo de streaming', async () => {
    vi.stubGlobal('WebSocket', FakeWebSocket);
    const user = userEvent.setup();
    const onFaceEvent = vi.fn();
    render(<ChatPanel onFaceEvent={onFaceEvent} />);

    const ws = FakeWebSocket.instances[0]!;
    ws.emitOpen();
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());

    await user.type(screen.getByRole('textbox'), 'oi');
    await user.click(screen.getByRole('button', { name: /enviar/i }));
    expect(onFaceEvent).toHaveBeenCalledWith('model_stream_start');

    const sentMessage = JSON.parse(ws.sent[0]!) as { requestId: string };
    ws.emitMessage({ kind: 'model_stream_token', requestId: sentMessage.requestId, token: 'x' });
    expect(onFaceEvent).toHaveBeenCalledWith('model_stream_token');

    ws.emitMessage({
      kind: 'model_stream_done',
      requestId: sentMessage.requestId,
      response: { decision: { profileId: 'chat-fast', providerId: 'ollama', modelId: 'm', reason: '', fallbackUsed: false }, content: 'x', latencyMs: 1 },
    });
    expect(onFaceEvent).toHaveBeenCalledWith('model_stream_done');
  });

  it('quando a voz está configurada, sintetiza a resposta e dispara voice.response.started/ended', async () => {
    vi.stubGlobal('WebSocket', FakeWebSocket);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob(['audio-fake'], { type: 'audio/mpeg' })) }),
    );
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn().mockReturnValue('blob:fake-url'), revokeObjectURL: vi.fn() });

    const fakeAudio = {
      listeners: new Map<string, () => void>(),
      addEventListener(type: string, listener: () => void) {
        this.listeners.set(type, listener);
      },
      play: vi.fn().mockImplementation(() => new Promise<void>((resolve) => resolve())),
      pause: vi.fn(),
      src: 'blob:fake-url',
    };
    vi.stubGlobal(
      'Audio',
      vi.fn().mockImplementation(() => fakeAudio),
    );

    const user = userEvent.setup();
    const onFaceEvent = vi.fn();
    render(<ChatPanel onFaceEvent={onFaceEvent} />);

    const ws = FakeWebSocket.instances[0]!;
    ws.emitOpen();
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());

    await user.type(screen.getByRole('textbox'), 'oi');
    await user.click(screen.getByRole('button', { name: /enviar/i }));

    const sentMessage = JSON.parse(ws.sent[0]!) as { requestId: string };
    ws.emitMessage({
      kind: 'model_stream_done',
      requestId: sentMessage.requestId,
      response: { decision: { profileId: 'chat-fast', providerId: 'ollama', modelId: 'm', reason: '', fallbackUsed: false }, content: 'Olá!', latencyMs: 1 },
    });

    await waitFor(() => expect(onFaceEvent).toHaveBeenCalledWith('voice.response.started'));
    expect(fakeAudio.play).toHaveBeenCalled();

    fakeAudio.listeners.get('ended')?.();
    expect(onFaceEvent).toHaveBeenCalledWith('voice.response.ended');
  });
});
