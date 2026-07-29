import { afterEach, describe, expect, it, vi } from 'vitest';
import { ElevenLabsClient } from './elevenlabs-client.js';

const SECRET_KEY = 'sk-nao-deve-vazar-jamais';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ElevenLabsClient', () => {
  it('listVoices() mapeia as vozes reais retornadas pela API e envia a apiKey no header xi-api-key', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          voices: [{ voice_id: 'abc123', name: 'George', category: 'premade', labels: { accent: 'american' } }],
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new ElevenLabsClient(SECRET_KEY);
    const voices = await client.listVoices();

    expect(voices).toEqual([{ voiceId: 'abc123', name: 'George', category: 'premade', labels: { accent: 'american' } }]);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['xi-api-key']).toBe(SECRET_KEY);
  });

  it('verifyKey() retorna true quando a chave é válida e false quando não é (nunca lança)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ voices: [] }) }));
    const validClient = new ElevenLabsClient(SECRET_KEY);
    await expect(validClient.verifyKey()).resolves.toBe(true);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    const invalidClient = new ElevenLabsClient('chave-invalida');
    await expect(invalidClient.verifyKey()).resolves.toBe(false);
  });

  it('textToSpeech() envia texto/voiceId corretos e retorna os bytes de áudio', async () => {
    const audioBytes = new Uint8Array([1, 2, 3, 4]);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(audioBytes.buffer),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new ElevenLabsClient(SECRET_KEY);
    const result = await client.textToSpeech({ voiceId: 'abc123', text: 'Olá, mundo' });

    expect(result).toEqual(audioBytes);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/text-to-speech/abc123');
    const body = JSON.parse(init.body as string) as { text: string; model_id: string };
    expect(body.text).toBe('Olá, mundo');
    expect(body.model_id).toBe('eleven_multilingual_v2');
  });

  it('textToSpeech() propaga erro real sem vazar a apiKey na mensagem', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, text: () => Promise.resolve('unauthorized') }));

    const client = new ElevenLabsClient(SECRET_KEY);
    await expect(client.textToSpeech({ voiceId: 'abc123', text: 'oi' })).rejects.toThrow('401');
  });

  it('textToSpeechStream() chama o endpoint /stream e retorna o ReadableStream bruto', async () => {
    const chunks = [new Uint8Array([1, 2]), new Uint8Array([3, 4])];
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, body });
    vi.stubGlobal('fetch', fetchMock);

    const client = new ElevenLabsClient(SECRET_KEY);
    const stream = await client.textToSpeechStream({ voiceId: 'abc123', text: 'Olá' });

    expect(stream).toBe(body);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/text-to-speech/abc123/stream');
  });

  it('textToSpeechStream() propaga erro real quando a API responde com falha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('server error') }));

    const client = new ElevenLabsClient(SECRET_KEY);
    await expect(client.textToSpeechStream({ voiceId: 'abc123', text: 'oi' })).rejects.toThrow('500');
  });

  it('speechToText() envia o áudio como multipart e retorna o texto transcrito', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ text: 'Olá, tudo bem?', language_code: 'por' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new ElevenLabsClient(SECRET_KEY);
    const result = await client.speechToText({
      audio: new Uint8Array([1, 2, 3]),
      filename: 'gravacao.webm',
      mimeType: 'audio/webm',
    });

    expect(result).toEqual({ text: 'Olá, tudo bem?', languageCode: 'por' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/speech-to-text');
    expect(init.body).toBeInstanceOf(FormData);
  });
});
