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
