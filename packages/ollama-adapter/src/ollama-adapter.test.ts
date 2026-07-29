import { afterEach, describe, expect, it, vi } from 'vitest';
import { OllamaAdapter } from './ollama-adapter.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Simula o corpo NDJSON de streaming do Ollama como um ReadableStream real. */
function ndjsonStreamBody(lines: object[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
      }
      controller.close();
    },
  });
}

describe('OllamaAdapter', () => {
  it('descriptor() reporta provider local_runtime', () => {
    const adapter = new OllamaAdapter();
    expect(adapter.descriptor()).toMatchObject({ id: 'ollama', kind: 'local_runtime' });
  });

  it('health() ok quando /api/tags responde', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ models: [] }) }));

    const adapter = new OllamaAdapter();
    const health = await adapter.health();

    expect(health.ok).toBe(true);
  });

  it('health() reporta falha real quando Ollama não responde (não finge sucesso)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const adapter = new OllamaAdapter();
    const health = await adapter.health();

    expect(health.ok).toBe(false);
    expect(health.detail).toContain('ECONNREFUSED');
  });

  it('listModels() mapeia modelos instalados com capacidades reais', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            models: [
              {
                name: 'llama3.2:1b',
                model: 'llama3.2:1b',
                size: 1_321_098_329,
                details: { parameter_size: '1.2B' },
                capabilities: ['completion', 'tools'],
              },
            ],
          }),
      }),
    );

    const adapter = new OllamaAdapter();
    const models = await adapter.listModels();

    expect(models).toHaveLength(1);
    expect(models[0]).toMatchObject({ id: 'llama3.2:1b', installed: true, sizeBytes: 1_321_098_329 });
    expect(models[0]?.capabilities).toContain('tools');
  });

  it('execute() envia mensagens e reporta custo zero explicitamente (nunca inventa preço)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            message: { role: 'assistant', content: 'olá!' },
            prompt_eval_count: 10,
            eval_count: 5,
          }),
      }),
    );

    const adapter = new OllamaAdapter();
    const response = await adapter.execute(
      { profileId: 'chat-fast', messages: [{ role: 'user', content: 'oi' }] },
      'llama3.2:1b',
    );

    expect(response.content).toBe('olá!');
    expect(response.tokensIn).toBe(10);
    expect(response.tokensOut).toBe(5);
    expect(response.estimatedCost).toEqual({ currency: 'BRL', amount: 0 });
  });

  it('execute() propaga erro real quando o modelo não existe', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, text: () => Promise.resolve('model not found') }),
    );

    const adapter = new OllamaAdapter();

    await expect(
      adapter.execute({ profileId: 'chat-fast', messages: [{ role: 'user', content: 'oi' }] }, 'inexistente'),
    ).rejects.toThrow('404');
  });

  it('executeStream() emite cada token recebido do NDJSON e agrega o conteúdo final', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: ndjsonStreamBody([
          { message: { role: 'assistant', content: 'olá' }, done: false },
          { message: { role: 'assistant', content: ' mundo' }, done: false },
          { message: { role: 'assistant', content: '' }, done: true, prompt_eval_count: 3, eval_count: 2 },
        ]),
      }),
    );

    const adapter = new OllamaAdapter();
    const tokens: string[] = [];
    const response = await adapter.executeStream(
      { profileId: 'chat-fast', messages: [{ role: 'user', content: 'oi' }] },
      'llama3.2:1b',
      (token) => tokens.push(token),
    );

    expect(tokens).toEqual(['olá', ' mundo']);
    expect(response.content).toBe('olá mundo');
    expect(response.tokensIn).toBe(3);
    expect(response.tokensOut).toBe(2);
  });

  it('executeStream() lança erro real se o stream encerrar sem chunk final (done: true)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: ndjsonStreamBody([{ message: { role: 'assistant', content: 'olá' }, done: false }]),
      }),
    );

    const adapter = new OllamaAdapter();

    await expect(
      adapter.executeStream(
        { profileId: 'chat-fast', messages: [{ role: 'user', content: 'oi' }] },
        'llama3.2:1b',
        () => {},
      ),
    ).rejects.toThrow('sem enviar o chunk final');
  });
});
