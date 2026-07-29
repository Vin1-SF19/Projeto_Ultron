import { describe, expect, it, vi, beforeEach } from 'vitest';

const startMock = vi.fn();
const stopMock = vi.fn();
const requestMock = vi.fn();
let capturedOptions: Record<string, unknown> | undefined;

vi.mock('@openclaw/gateway-client', () => {
  return {
    GatewayClient: vi.fn().mockImplementation((options: Record<string, unknown>) => {
      capturedOptions = options;
      return { start: startMock, stop: stopMock, request: requestMock };
    }),
  };
});

const { OpenClawAdapter } = await import('./openclaw-adapter.js');

describe('OpenClawAdapter', () => {
  beforeEach(() => {
    startMock.mockClear();
    stopMock.mockClear();
    requestMock.mockClear();
    capturedOptions = undefined;
  });

  it('não conecta quando desabilitado (integração opcional, off por padrão)', () => {
    const onDomainEvent = vi.fn();
    const adapter = new OpenClawAdapter({ enabled: false, url: 'ws://127.0.0.1:18789' }, { onDomainEvent });

    adapter.connect();

    expect(startMock).not.toHaveBeenCalled();
    expect(adapter.getState()).toBe('disabled');
  });

  it('conecta quando habilitado, passando protocolo v4 e o token configurado', () => {
    const onDomainEvent = vi.fn();
    const adapter = new OpenClawAdapter(
      { enabled: true, url: 'ws://127.0.0.1:18789', token: 'segredo-nao-deve-vazar' },
      { onDomainEvent },
    );

    adapter.connect();

    expect(startMock).toHaveBeenCalledTimes(1);
    expect(capturedOptions?.minProtocol).toBe(4);
    expect(capturedOptions?.maxProtocol).toBe(4);
    expect(capturedOptions?.token).toBe('segredo-nao-deve-vazar');
    expect(adapter.getState()).toBe('connecting');
  });

  it('nunca inclui o token em nenhuma chamada de log', () => {
    const logInfo = vi.fn();
    const logError = vi.fn();
    const adapter = new OpenClawAdapter(
      { enabled: true, url: 'ws://127.0.0.1:18789', token: 'segredo-nao-deve-vazar' },
      { onDomainEvent: vi.fn(), logInfo, logError },
    );

    adapter.connect();
    (capturedOptions?.onConnectError as (err: Error) => void)(new Error('falhou'));
    (capturedOptions?.onClose as (code: number, reason: string) => void)(1000, 'bye');

    const allLogCalls = [...logInfo.mock.calls, ...logError.mock.calls].flat();
    const serialized = JSON.stringify(allLogCalls);
    expect(serialized).not.toContain('segredo-nao-deve-vazar');
  });

  it('atualiza o estado para connected ao receber hello-ok', () => {
    const adapter = new OpenClawAdapter(
      { enabled: true, url: 'ws://127.0.0.1:18789' },
      { onDomainEvent: vi.fn() },
    );

    adapter.connect();
    (capturedOptions?.onHelloOk as () => void)();

    expect(adapter.getState()).toBe('connected');
  });

  it('traduz eventos recebidos do gateway para DomainEvent via callback', () => {
    const onDomainEvent = vi.fn();
    const adapter = new OpenClawAdapter(
      { enabled: true, url: 'ws://127.0.0.1:18789' },
      { onDomainEvent },
    );

    adapter.connect();
    (capturedOptions?.onEvent as (frame: { event: string; payload: unknown; seq?: number }) => void)({
      event: 'agent.message',
      payload: { text: 'oi' },
      seq: 1,
    });

    expect(onDomainEvent).toHaveBeenCalledTimes(1);
    const emitted = onDomainEvent.mock.calls[0]?.[0];
    expect(emitted.type).toBe('integration.openclaw.agent.message');
  });

  it('health() reporta não-ok quando não conectado', async () => {
    const adapter = new OpenClawAdapter(
      { enabled: true, url: 'ws://127.0.0.1:18789' },
      { onDomainEvent: vi.fn() },
    );

    const result = await adapter.health();

    expect(result.ok).toBe(false);
  });

  it('health() usa client.request("status") quando conectado', async () => {
    requestMock.mockResolvedValue({ uptime: 10 });
    const adapter = new OpenClawAdapter(
      { enabled: true, url: 'ws://127.0.0.1:18789' },
      { onDomainEvent: vi.fn() },
    );

    adapter.connect();
    (capturedOptions?.onHelloOk as () => void)();

    const result = await adapter.health();

    expect(requestMock).toHaveBeenCalledWith('status', {});
    expect(result.ok).toBe(true);
  });

  it('disconnect() chama stop() do client e volta ao estado disabled', () => {
    const adapter = new OpenClawAdapter(
      { enabled: true, url: 'ws://127.0.0.1:18789' },
      { onDomainEvent: vi.fn() },
    );

    adapter.connect();
    adapter.disconnect();

    expect(stopMock).toHaveBeenCalledTimes(1);
    expect(adapter.getState()).toBe('disabled');
  });

  it('chamar connect() duas vezes não cria uma segunda conexão', () => {
    const adapter = new OpenClawAdapter(
      { enabled: true, url: 'ws://127.0.0.1:18789' },
      { onDomainEvent: vi.fn() },
    );

    adapter.connect();
    adapter.connect();

    expect(startMock).toHaveBeenCalledTimes(1);
  });
});
