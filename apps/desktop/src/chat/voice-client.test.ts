import { afterEach, describe, expect, it, vi } from 'vitest';
import { synthesizeSpeech, transcribeAudio, VoiceNotConfiguredError } from './voice-client.js';

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
