import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenAiCompatibleAdapter } from './openai-compatible-adapter.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

const SECRET_KEY = 'sk-nao-deve-vazar-jamais';

/** Simula o corpo SSE de streaming (`data: {...}\n\n`, terminado por [DONE]). */
function sseStreamBody(events: (object | '[DONE]')[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const event of events) {
        const data = event === '[DONE]' ? '[DONE]' : JSON.stringify(event);
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }
      controller.close();
    },
  });
}

function makeAdapter() {
  return new OpenAiCompatibleAdapter({
    providerId: 'ollama-remote',
    displayName: 'Ollama Remoto',
    baseUrl: 'https://ollama.alpha-comex.com/v1',
    apiKey: SECRET_KEY,
  });
}

describe('OpenAiCompatibleAdapter', () => {
  it('descriptor() nunca inclui a apiKey', () => {
    const adapter = makeAdapter();
    expect(JSON.stringify(adapter.descriptor())).not.toContain(SECRET_KEY);
  });

  it('health() ok quando /models responde', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ object: 'list', data: [] }) }));

    const adapter = makeAdapter();
    const health = await adapter.health();

    expect(health.ok).toBe(true);
  });

  it('health() reporta falha real sem vazar a apiKey na mensagem', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    const adapter = makeAdapter();
    const health = await adapter.health();

    expect(health.ok).toBe(false);
    expect(health.detail).not.toContain(SECRET_KEY);
  });

  it('listModels() mapeia modelos reais retornados pela API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            object: 'list',
            data: [{ id: 'qwen3:14b', object: 'model', owned_by: 'library' }],
          }),
      }),
    );

    const adapter = makeAdapter();
    const models = await adapter.listModels();

    expect(models).toEqual([
      { id: 'qwen3:14b', providerId: 'ollama-remote', displayName: 'qwen3:14b', capabilities: ['text', 'tools'], installed: true },
    ]);
  });

  it('execute() envia Authorization Bearer e mapeia resposta/uso real', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 'chatcmpl-1',
          choices: [{ message: { role: 'assistant', content: 'Paris' } }],
          usage: { prompt_tokens: 24, completion_tokens: 1, total_tokens: 25 },
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = makeAdapter();
    const response = await adapter.execute(
      { profileId: 'chat-fast', messages: [{ role: 'user', content: 'capital da frança?' }] },
      'qwen3:14b',
    );

    expect(response.content).toBe('Paris');
    expect(response.tokensIn).toBe(24);
    expect(response.tokensOut).toBe(1);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Bearer ${SECRET_KEY}`);
  });

  it('sem tabela de preço configurada, estimatedCost fica undefined (nunca inventa custo)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'chatcmpl-1',
            choices: [{ message: { role: 'assistant', content: 'ok' } }],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }),
      }),
    );

    const adapter = makeAdapter();
    const response = await adapter.execute({ profileId: 'chat-fast', messages: [{ role: 'user', content: 'oi' }] }, 'qwen3:14b');

    expect(response.estimatedCost).toBeUndefined();
  });

  it('executeStream() emite cada delta do SSE e agrega o conteúdo final', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: sseStreamBody([
          { id: 'chatcmpl-1', choices: [{ delta: { content: 'Pa' } }] },
          { id: 'chatcmpl-1', choices: [{ delta: { content: 'ris' } }] },
          {
            id: 'chatcmpl-1',
            choices: [{ delta: {}, finish_reason: 'stop' }],
            usage: { prompt_tokens: 24, completion_tokens: 1, total_tokens: 25 },
          },
          '[DONE]',
        ]),
      }),
    );

    const adapter = makeAdapter();
    const tokens: string[] = [];
    const response = await adapter.executeStream(
      { profileId: 'chat-fast', messages: [{ role: 'user', content: 'capital da frança?' }] },
      'qwen3:14b',
      (token) => tokens.push(token),
    );

    expect(tokens).toEqual(['Pa', 'ris']);
    expect(response.content).toBe('Paris');
    expect(response.tokensIn).toBe(24);
    expect(response.tokensOut).toBe(1);
  });
});
