export type VoiceRecorderState = 'idle' | 'recording' | 'error';

export class MicrophonePermissionDeniedError extends Error {
  constructor() {
    super('Permissão de microfone negada.');
    this.name = 'MicrophonePermissionDeniedError';
  }
}

/**
 * Captura áudio do microfone via MediaRecorder (Web API padrão, disponível
 * no WebView2/WKWebView do Tauri sem nenhuma permissão adicional do Tauri —
 * quem controla o acesso ao microfone é o próprio navegador embutido, que
 * exibe o prompt nativo do SO na primeira chamada de getUserMedia).
 */
export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | undefined;
  private stream: MediaStream | undefined;
  private chunks: BlobPart[] = [];

  async start(): Promise<void> {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      throw new MicrophonePermissionDeniedError();
    }

    this.stream = stream;
    this.chunks = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
    this.mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    this.mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    });
    this.mediaRecorder.start();
  }

  /** Para a gravação e retorna o áudio capturado. */
  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const recorder = this.mediaRecorder;
      if (!recorder) {
        reject(new Error('Gravação não foi iniciada.'));
        return;
      }
      recorder.addEventListener(
        'stop',
        () => {
          const blob = new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' });
          this.stream?.getTracks().forEach((track) => track.stop());
          this.stream = undefined;
          this.mediaRecorder = undefined;
          resolve(blob);
        },
        { once: true },
      );
      recorder.stop();
    });
  }

  cancel(): void {
    this.mediaRecorder?.stop();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = undefined;
    this.mediaRecorder = undefined;
    this.chunks = [];
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}
