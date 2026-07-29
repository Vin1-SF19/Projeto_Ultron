const DEFAULT_BASE_URL = 'https://api.elevenlabs.io';

export interface ElevenLabsVoice {
  voiceId: string;
  name: string;
  category: string;
  labels: Record<string, string>;
}

export interface ElevenLabsVoicesResponse {
  voices: Array<{
    voice_id: string;
    name: string;
    category: string;
    labels?: Record<string, string>;
  }>;
}

export interface TextToSpeechOptions {
  voiceId: string;
  text: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

export interface SpeechToTextOptions {
  /** Arquivo de áudio como Buffer (ex: gravação do microfone em webm/wav). */
  audio: Uint8Array;
  filename: string;
  mimeType: string;
  /** Código de idioma ISO-639-1 (ex: "por" para português) — se omitido, a API detecta automaticamente. */
  languageCode?: string;
}

export interface SpeechToTextResult {
  text: string;
  languageCode?: string;
}

/**
 * Cliente HTTP fino para a API da ElevenLabs (voz) — sem lógica de domínio.
 * Nunca loga a apiKey; ela só trafega no header xi-api-key de cada chamada.
 */
export class ElevenLabsClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = DEFAULT_BASE_URL,
  ) {}

  private headers(extra?: Record<string, string>): Record<string, string> {
    return { 'xi-api-key': this.apiKey, ...extra };
  }

  async listVoices(signal?: AbortSignal): Promise<ElevenLabsVoice[]> {
    const response = await fetch(`${this.baseUrl}/v1/voices`, { headers: this.headers(), signal });
    if (!response.ok) {
      throw new Error(`ElevenLabs /v1/voices respondeu ${response.status}`);
    }
    const body = (await response.json()) as ElevenLabsVoicesResponse;
    return body.voices.map((v) => ({
      voiceId: v.voice_id,
      name: v.name,
      category: v.category,
      labels: v.labels ?? {},
    }));
  }

  /** Verifica se a chave é válida sem side effects — reaproveita /v1/voices. */
  async verifyKey(signal?: AbortSignal): Promise<boolean> {
    try {
      await this.listVoices(signal);
      return true;
    } catch {
      return false;
    }
  }

  async textToSpeech(options: TextToSpeechOptions, signal?: AbortSignal): Promise<Uint8Array> {
    const response = await fetch(`${this.baseUrl}/v1/text-to-speech/${options.voiceId}`, {
      method: 'POST',
      headers: this.headers({ 'content-type': 'application/json' }),
      body: JSON.stringify({
        text: options.text,
        model_id: options.modelId ?? 'eleven_multilingual_v2',
        voice_settings: {
          stability: options.stability ?? 0.5,
          similarity_boost: options.similarityBoost ?? 0.75,
        },
      }),
      signal,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`ElevenLabs /v1/text-to-speech respondeu ${response.status}: ${text}`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  /**
   * Streaming real via /v1/text-to-speech/{voiceId}/stream (chunked,
   * confirmado: primeiro byte chega em ~1ms). Retorna o ReadableStream bruto
   * para o chamador repassar sem bufferizar tudo antes de responder.
   */
  async textToSpeechStream(options: TextToSpeechOptions, signal?: AbortSignal): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(`${this.baseUrl}/v1/text-to-speech/${options.voiceId}/stream`, {
      method: 'POST',
      headers: this.headers({ 'content-type': 'application/json' }),
      body: JSON.stringify({
        text: options.text,
        model_id: options.modelId ?? 'eleven_multilingual_v2',
        voice_settings: {
          stability: options.stability ?? 0.5,
          similarity_boost: options.similarityBoost ?? 0.75,
        },
      }),
      signal,
    });
    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => '');
      throw new Error(`ElevenLabs /v1/text-to-speech/stream respondeu ${response.status}: ${text}`);
    }
    return response.body;
  }

  async speechToText(options: SpeechToTextOptions, signal?: AbortSignal): Promise<SpeechToTextResult> {
    const form = new FormData();
    form.append('model_id', 'scribe_v1');
    if (options.languageCode) {
      form.append('language_code', options.languageCode);
    }
    form.append('file', new Blob([options.audio], { type: options.mimeType }), options.filename);

    const response = await fetch(`${this.baseUrl}/v1/speech-to-text`, {
      method: 'POST',
      headers: this.headers(),
      body: form,
      signal,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`ElevenLabs /v1/speech-to-text respondeu ${response.status}: ${text}`);
    }
    const body = (await response.json()) as { text: string; language_code?: string };
    return { text: body.text, languageCode: body.language_code };
  }
}
