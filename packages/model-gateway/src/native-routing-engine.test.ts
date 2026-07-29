import { describe, expect, it, vi } from 'vitest';
import type { Model, ModelRequest, ModelResponse, Provider, ProviderHealth } from '@ultron/contracts';
import type { ModelProviderAdapter } from './model-provider.js';
import { NativeRoutingEngine, NoProviderAvailableError } from './native-routing-engine.js';

function makeAdapter(
  id: string,
  opts: {
    models: Model[];
    healthy?: boolean;
    executeImpl?: () => Promise<ModelResponse>;
    executeStreamImpl?: (onToken: (token: string) => void) => Promise<ModelResponse>;
  },
): ModelProviderAdapter {
  const descriptor: Provider = { id, name: id, kind: 'local_runtime', enabled: true };
  const health: ProviderHealth = { providerId: id, ok: opts.healthy ?? true, checkedAt: new Date().toISOString() };

  return {
    descriptor: () => descriptor,
    health: vi.fn().mockResolvedValue(health),
    listModels: vi.fn().mockResolvedValue(opts.models),
    execute:
      opts.executeImpl ??
      vi.fn().mockResolvedValue({
        decision: { profileId: 'chat-fast', providerId: id, modelId: opts.models[0]?.id ?? '', reason: '', fallbackUsed: false },
        content: 'ok',
        latencyMs: 1,
      } satisfies ModelResponse),
    executeStream: opts.executeStreamImpl
      ? vi.fn((_request, _modelId, onToken: (token: string) => void) => opts.executeStreamImpl!(onToken))
      : undefined,
  };
}

const baseRequest: ModelRequest = {
  profileId: 'chat-fast',
  messages: [{ role: 'user', content: 'oi' }],
};

describe('NativeRoutingEngine', () => {
  it('escolhe o provider preferido quando disponível', async () => {
    const ollama = makeAdapter('ollama', { models: [{ id: 'llama3', providerId: 'ollama', displayName: 'Llama 3', capabilities: ['text'] }] });

    const engine = new NativeRoutingEngine({
      profiles: new Map([
        ['chat-fast', { id: 'chat-fast', requiredCapabilities: ['text'], preferredProviders: ['ollama'], preferredModels: ['llama3'], fallbacks: [], preferLocal: true }],
      ]),
      adapters: new Map([['ollama', ollama]]),
    });

    const decision = await engine.route(baseRequest);

    expect(decision.providerId).toBe('ollama');
    expect(decision.fallbackUsed).toBe(false);
  });

  it('usa fallback quando o provider preferido lança erro', async () => {
    const failing = makeAdapter('openai', {
      models: [{ id: 'gpt', providerId: 'openai', displayName: 'GPT', capabilities: ['text'] }],
    });
    failing.listModels = vi.fn().mockRejectedValue(new Error('sem API key'));

    const fallback = makeAdapter('ollama', {
      models: [{ id: 'llama3', providerId: 'ollama', displayName: 'Llama 3', capabilities: ['text'] }],
    });

    const engine = new NativeRoutingEngine({
      profiles: new Map([
        [
          'chat-fast',
          {
            id: 'chat-fast',
            requiredCapabilities: ['text'],
            preferredProviders: ['openai'],
            preferredModels: ['gpt'],
            fallbacks: ['ollama'],
            preferLocal: false,
          },
        ],
      ]),
      adapters: new Map([
        ['openai', failing],
        ['ollama', fallback],
      ]),
    });

    const decision = await engine.route(baseRequest);

    expect(decision.providerId).toBe('ollama');
    expect(decision.fallbackUsed).toBe(true);
    expect(decision.reason).toContain('fallback');
  });

  it('lança NoProviderAvailableError quando nenhum provider está configurado', async () => {
    const engine = new NativeRoutingEngine({
      profiles: new Map([
        ['chat-fast', { id: 'chat-fast', requiredCapabilities: ['text'], preferredProviders: [], preferredModels: [], fallbacks: [], preferLocal: false }],
      ]),
      adapters: new Map(),
    });

    await expect(engine.route(baseRequest)).rejects.toThrow(NoProviderAvailableError);
  });

  it('abre o circuit breaker após falhas repetidas e não tenta mais aquele provider', async () => {
    const flaky = makeAdapter('flaky', { models: [{ id: 'm', providerId: 'flaky', displayName: 'M', capabilities: ['text'] }] });
    flaky.listModels = vi.fn().mockRejectedValue(new Error('indisponível'));

    const engine = new NativeRoutingEngine({
      profiles: new Map([
        ['chat-fast', { id: 'chat-fast', requiredCapabilities: ['text'], preferredProviders: ['flaky'], preferredModels: ['m'], fallbacks: [], preferLocal: false }],
      ]),
      adapters: new Map([['flaky', flaky]]),
      circuitBreakerOptions: { failureThreshold: 1, resetTimeoutMs: 60_000 },
    });

    await expect(engine.route(baseRequest)).rejects.toThrow();
    await expect(engine.route(baseRequest)).rejects.toThrow(NoProviderAvailableError);
    // segunda tentativa nem chega a chamar listModels de novo, pois o breaker já está aberto
    expect(flaky.listModels).toHaveBeenCalledTimes(1);
  });

  it('execute() retorna a resposta do adapter com a decisão anexada', async () => {
    const ollama = makeAdapter('ollama', { models: [{ id: 'llama3', providerId: 'ollama', displayName: 'Llama 3', capabilities: ['text'] }] });

    const engine = new NativeRoutingEngine({
      profiles: new Map([
        ['chat-fast', { id: 'chat-fast', requiredCapabilities: ['text'], preferredProviders: ['ollama'], preferredModels: ['llama3'], fallbacks: [], preferLocal: true }],
      ]),
      adapters: new Map([['ollama', ollama]]),
    });

    const response = await engine.execute(baseRequest);

    expect(response.content).toBe('ok');
    expect(response.decision.providerId).toBe('ollama');
  });

  it('stream() usa executeStream do adapter e emite tokens incrementalmente', async () => {
    const ollama = makeAdapter('ollama', {
      models: [{ id: 'llama3', providerId: 'ollama', displayName: 'Llama 3', capabilities: ['text'] }],
      executeStreamImpl: async (onToken) => {
        onToken('olá');
        onToken(' mundo');
        return {
          decision: { profileId: 'chat-fast', providerId: 'ollama', modelId: 'llama3', reason: '', fallbackUsed: false },
          content: 'olá mundo',
          latencyMs: 1,
        };
      },
    });

    const engine = new NativeRoutingEngine({
      profiles: new Map([
        ['chat-fast', { id: 'chat-fast', requiredCapabilities: ['text'], preferredProviders: ['ollama'], preferredModels: ['llama3'], fallbacks: [], preferLocal: true }],
      ]),
      adapters: new Map([['ollama', ollama]]),
    });

    const tokens: string[] = [];
    const done = new Promise<ModelResponse>((resolve) => {
      void engine.stream(baseRequest, { onToken: (t) => tokens.push(t), onDone: resolve });
    });

    const response = await done;
    expect(tokens).toEqual(['olá', ' mundo']);
    expect(response.content).toBe('olá mundo');
  });

  it('stream() cai para modo não incremental (token único) quando o adapter não suporta executeStream', async () => {
    const ollama = makeAdapter('ollama', {
      models: [{ id: 'llama3', providerId: 'ollama', displayName: 'Llama 3', capabilities: ['text'] }],
      executeImpl: vi.fn().mockResolvedValue({
        decision: { profileId: 'chat-fast', providerId: 'ollama', modelId: 'llama3', reason: '', fallbackUsed: false },
        content: 'resposta inteira',
        latencyMs: 1,
      }),
    });

    const engine = new NativeRoutingEngine({
      profiles: new Map([
        ['chat-fast', { id: 'chat-fast', requiredCapabilities: ['text'], preferredProviders: ['ollama'], preferredModels: ['llama3'], fallbacks: [], preferLocal: true }],
      ]),
      adapters: new Map([['ollama', ollama]]),
    });

    const tokens: string[] = [];
    const done = new Promise<ModelResponse>((resolve) => {
      void engine.stream(baseRequest, { onToken: (t) => tokens.push(t), onDone: resolve });
    });

    const response = await done;
    expect(tokens).toEqual(['resposta inteira']);
    expect(response.content).toBe('resposta inteira');
  });

  it('stream() chama onError e não onDone quando o adapter falha', async () => {
    const failing = makeAdapter('ollama', {
      models: [{ id: 'llama3', providerId: 'ollama', displayName: 'Llama 3', capabilities: ['text'] }],
      executeStreamImpl: async () => {
        throw new Error('conexão perdida');
      },
    });

    const engine = new NativeRoutingEngine({
      profiles: new Map([
        ['chat-fast', { id: 'chat-fast', requiredCapabilities: ['text'], preferredProviders: ['ollama'], preferredModels: ['llama3'], fallbacks: [], preferLocal: true }],
      ]),
      adapters: new Map([['ollama', failing]]),
    });

    const onDone = vi.fn();
    const error = await new Promise<Error>((resolve) => {
      void engine.stream(baseRequest, { onDone, onError: resolve });
    });

    expect(error.message).toBe('conexão perdida');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('listProviders/listModels agregam todos os adapters', async () => {
    const ollama = makeAdapter('ollama', { models: [{ id: 'llama3', providerId: 'ollama', displayName: 'Llama 3', capabilities: ['text'] }] });

    const engine = new NativeRoutingEngine({
      profiles: new Map(),
      adapters: new Map([['ollama', ollama]]),
    });

    const providers = await engine.listProviders();
    const models = await engine.listModels();

    expect(providers).toHaveLength(1);
    expect(models).toHaveLength(1);
  });
});
