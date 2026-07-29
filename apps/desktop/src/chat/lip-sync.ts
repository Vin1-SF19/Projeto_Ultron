export interface VoicePlaybackSession {
  audio: HTMLAudioElement;
}

export interface AudioAnalysisFrame {
  /** Amplitude RMS normalizada entre 0 (silêncio) e 1 (volume máximo). */
  amplitude: number;
}

export interface LipSyncDriver {
  start(session: VoicePlaybackSession): void;
  update(frame: AudioAnalysisFrame): void;
  stop(): void;
}

const FRAME_INTERVAL_MS = 1000 / 30;

/**
 * Camada 1 de sincronização labial (seção 25 do prompt mestre):
 * amplitude do áudio via Web Audio AnalyserNode. Lê o <audio> que já está
 * tocando (não duplica a reprodução), mede o volume em tempo real e
 * repassa a amplitude normalizada para quem consumir via onAmplitude.
 *
 * Usa setInterval em vez de requestAnimationFrame: rAF é pausado/throttled
 * pelo navegador quando a janela perde o foco ou é minimizada, o que
 * congelaria a boca (mas não o áudio, que continua tocando normalmente)
 * assim que o usuário trocasse de janela durante a fala.
 *
 * Se a Web Audio API falhar por qualquer motivo, a voz continua tocando
 * normalmente — o lip sync nunca a interrompe.
 */
export class AmplitudeLipSyncDriver implements LipSyncDriver {
  private audioContext: AudioContext | undefined;
  private analyser: AnalyserNode | undefined;
  private source: MediaElementAudioSourceNode | undefined;
  private dataArray: Uint8Array<ArrayBuffer> | undefined;
  private intervalId: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly onAmplitude: (amplitude: number) => void) {}

  start(session: VoicePlaybackSession): void {
    try {
      const AudioContextCtor = window.AudioContext;
      if (!AudioContextCtor) return;

      this.audioContext = new AudioContextCtor();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.dataArray = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

      this.source = this.audioContext.createMediaElementSource(session.audio);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      if (this.audioContext.state === 'suspended') {
        void this.audioContext.resume();
      }

      this.intervalId = setInterval(this.tick, FRAME_INTERVAL_MS);
    } catch (error) {
      console.warn('Lip sync indisponível — voz continua sem sincronização labial:', error);
      this.stop();
    }
  }

  private tick = () => {
    if (!this.analyser || !this.dataArray) return;
    this.analyser.getByteTimeDomainData(this.dataArray);

    let sumSquares = 0;
    for (const sample of this.dataArray) {
      const normalized = (sample - 128) / 128;
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / this.dataArray.length);
    this.update({ amplitude: Math.min(1, rms * 4) });
  };

  update(frame: AudioAnalysisFrame): void {
    this.onAmplitude(frame.amplitude);
  }

  stop(): void {
    if (this.intervalId !== undefined) clearInterval(this.intervalId);
    this.intervalId = undefined;
    this.source?.disconnect();
    this.analyser?.disconnect();
    void this.audioContext?.close().catch(() => {});
    this.audioContext = undefined;
    this.analyser = undefined;
    this.source = undefined;
    this.dataArray = undefined;
    this.onAmplitude(0);
  }
}
