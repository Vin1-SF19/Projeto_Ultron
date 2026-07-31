const CONTROL_PLANE_BASE_URL = 'http://127.0.0.1:4577';

export class VoiceNotConfiguredError extends Error {
  constructor() {
    super('Voz ainda não configurada.');
    this.name = 'VoiceNotConfiguredError';
  }
}

/** Sintetiza o texto em áudio via ElevenLabs (Control Plane real) e retorna uma URL de objeto tocável. */
export async function synthesizeSpeech(text: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(`${CONTROL_PLANE_BASE_URL}/api/v1/voice/speak`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
    signal,
  });

  if (!response.ok) {
    if (response.status === 400) {
      const body = (await response.json().catch(() => null)) as { error?: { code?: string } } | null;
      if (body?.error?.code === 'voice_not_configured') {
        throw new VoiceNotConfiguredError();
      }
    }
    throw new Error(`Falha ao sintetizar voz: Control Plane respondeu ${response.status}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

const STREAM_MIME_TYPE = 'audio/mpeg';

export function isMediaSourceStreamingSupported(): boolean {
  return typeof window.MediaSource !== 'undefined' && MediaSource.isTypeSupported(STREAM_MIME_TYPE);
}

/**
 * Sintetiza o texto via o endpoint de streaming real (/voice/speak/stream) e
 * alimenta um MediaSource incrementalmente, para o áudio começar a tocar
 * antes da síntese completa terminar. Chama onFirstChunk assim que o
 * primeiro pedaço de áudio chega (o momento em que dá para iniciar o
 * <audio>.play()).
 */
export async function synthesizeSpeechStreamingIntoMediaSource(
  text: string,
  mediaSource: MediaSource,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${CONTROL_PLANE_BASE_URL}/api/v1/voice/speak/stream`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
    signal,
  });

  if (!response.ok || !response.body) {
    if (response.status === 400) {
      const body = (await response.json().catch(() => null)) as { error?: { code?: string } } | null;
      if (body?.error?.code === 'voice_not_configured') {
        throw new VoiceNotConfiguredError();
      }
    }
    throw new Error(`Falha ao sintetizar voz (streaming): Control Plane respondeu ${response.status}`);
  }

  const sourceBuffer = mediaSource.addSourceBuffer(STREAM_MIME_TYPE);
  const reader = response.body.getReader();

  function appendChunk(chunk: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      const onUpdateEnd = () => {
        sourceBuffer.removeEventListener('updateend', onUpdateEnd);
        resolve();
      };
      const onError = (event: Event) => {
        sourceBuffer.removeEventListener('error', onError);
        reject(event);
      };
      sourceBuffer.addEventListener('updateend', onUpdateEnd, { once: true });
      sourceBuffer.addEventListener('error', onError, { once: true });
      sourceBuffer.appendBuffer(chunk.slice().buffer);
    });
  }

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    await appendChunk(value);
  }

  if (mediaSource.readyState === 'open') {
    mediaSource.endOfStream();
  }
}

export interface TranscriptionResult {
  text: string;
  languageCode?: string;
}

/** Envia um áudio gravado (ex: do microfone) para transcrição via ElevenLabs. */
export async function transcribeAudio(audio: Blob, filename: string): Promise<TranscriptionResult> {
  const form = new FormData();
  form.append('audio', audio, filename);

  const response = await fetch(`${CONTROL_PLANE_BASE_URL}/api/v1/voice/transcribe`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    if (response.status === 400) {
      const body = (await response.json().catch(() => null)) as { error?: { code?: string } } | null;
      if (body?.error?.code === 'voice_not_configured') {
        throw new VoiceNotConfiguredError();
      }
    }
    throw new Error(`Falha ao transcrever áudio: Control Plane respondeu ${response.status}`);
  }

  return (await response.json()) as TranscriptionResult;
}
