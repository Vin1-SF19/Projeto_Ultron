import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isMediaSourceStreamingSupported,
  synthesizeSpeech,
  synthesizeSpeechStreamingIntoMediaSource,
  transcribeAudio,
  VoiceNotConfiguredError,
} from './voice-client.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('synthesizeSpeech', () => {
  it('retorna uma URL de objeto tocável quando a síntese funciona', async () => {
    const fakeBlob = new Blob(['audio'], { type: 'audio/mpeg' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(fakeBlob) }));
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn().mockReturnValue('blob:abc') });

    const url = await synthesizeSpeech('Olá');
    expect(url).toBe('blob:abc');
  });

  it('lança VoiceNotConfiguredError quando o Control Plane reporta voz não configurada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: { code: 'voice_not_configured' } }),
      }),
    );

    await expect(synthesizeSpeech('Olá')).rejects.toThrow(VoiceNotConfiguredError);
  });

  it('lança erro genérico para outras falhas do Control Plane', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) }));

    await expect(synthesizeSpeech('Olá')).rejects.toThrow('500');
  });
});

describe('isMediaSourceStreamingSupported', () => {
  it('retorna false quando MediaSource não existe no ambiente (ex: jsdom)', () => {
    vi.stubGlobal('MediaSource', undefined);
    expect(isMediaSourceStreamingSupported()).toBe(false);
  });

  it('retorna true quando MediaSource existe e suporta audio/mpeg', () => {
    vi.stubGlobal('MediaSource', { isTypeSupported: vi.fn().mockReturnValue(true) });
    expect(isMediaSourceStreamingSupported()).toBe(true);
  });

  it('retorna false quando MediaSource existe mas não suporta audio/mpeg', () => {
    vi.stubGlobal('MediaSource', { isTypeSupported: vi.fn().mockReturnValue(false) });
    expect(isMediaSourceStreamingSupported()).toBe(false);
  });
});

describe('synthesizeSpeechStreamingIntoMediaSource', () => {
  function fakeSourceBuffer() {
    const listeners = new Map<string, Array<() => void>>();
    return {
      addEventListener(type: string, listener: () => void) {
        const list = listeners.get(type) ?? [];
        list.push(listener);
        listeners.set(type, list);
      },
      removeEventListener() {},
      appendBuffer: vi.fn().mockImplementation(function (this: { emit: (t: string) => void }) {
        // Simula o updateend assíncrono do SourceBuffer real.
        queueMicrotask(() => listeners.get('updateend')?.forEach((l) => l()));
      }),
    };
  }

  function fakeMediaSource() {
    const sourceBuffer = fakeSourceBuffer();
    return {
      readyState: 'open' as const,
      addSourceBuffer: vi.fn().mockReturnValue(sourceBuffer),
      endOfStream: vi.fn(),
      sourceBuffer,
    };
  }

  it('lê o stream chunked e alimenta o SourceBuffer incrementalmente, encerrando com endOfStream', async () => {
    const chunks = [new Uint8Array([1, 2]), new Uint8Array([3, 4, 5])];
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body }));

    const mediaSource = fakeMediaSource();
    await synthesizeSpeechStreamingIntoMediaSource('Olá', mediaSource as unknown as MediaSource);

    expect(mediaSource.sourceBuffer.appendBuffer).toHaveBeenCalledTimes(2);
    expect(mediaSource.endOfStream).toHaveBeenCalled();
  });

  it('lança VoiceNotConfiguredError quando o Control Plane reporta voz não configurada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: { code: 'voice_not_configured' } }),
      }),
    );

    const mediaSource = fakeMediaSource();
    await expect(
      synthesizeSpeechStreamingIntoMediaSource('Olá', mediaSource as unknown as MediaSource),
    ).rejects.toThrow(VoiceNotConfiguredError);
  });
});

describe('transcribeAudio', () => {
  it('envia o áudio como multipart e retorna o texto transcrito', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ text: 'Olá, tudo bem?', languageCode: 'por' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await transcribeAudio(new Blob(['audio'], { type: 'audio/webm' }), 'gravacao.webm');

    expect(result).toEqual({ text: 'Olá, tudo bem?', languageCode: 'por' });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBeInstanceOf(FormData);
  });

  it('lança VoiceNotConfiguredError quando o Control Plane reporta voz não configurada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: { code: 'voice_not_configured' } }),
      }),
    );

    await expect(transcribeAudio(new Blob(['audio']), 'a.webm')).rejects.toThrow(VoiceNotConfiguredError);
  });
});
