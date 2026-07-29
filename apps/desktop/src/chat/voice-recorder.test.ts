import { afterEach, describe, expect, it, vi } from 'vitest';
import { MicrophonePermissionDeniedError, VoiceRecorder } from './voice-recorder.js';

class FakeMediaRecorder {
  static isTypeSupported = vi.fn().mockReturnValue(true);
  state: 'inactive' | 'recording' = 'inactive';
  mimeType = 'audio/webm';
  listeners = new Map<string, Array<(event: unknown) => void>>();

  constructor(
    public stream: MediaStream,
    public options?: unknown,
  ) {}

  addEventListener(type: string, listener: (event: unknown) => void) {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    for (const listener of this.listeners.get('dataavailable') ?? []) {
      listener({ data: new Blob(['fake-audio-chunk']) });
    }
    for (const listener of this.listeners.get('stop') ?? []) listener({});
  }
}

function fakeStream(): MediaStream {
  const track = { stop: vi.fn() };
  return { getTracks: () => [track] } as unknown as MediaStream;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('VoiceRecorder', () => {
  it('start() pede permissão via getUserMedia e inicia a gravação', async () => {
    const stream = fakeStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);

    const recorder = new VoiceRecorder();
    await recorder.start();

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(recorder.isRecording()).toBe(true);
  });

  it('start() lança MicrophonePermissionDeniedError quando o usuário nega a permissão', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(new Error('Permission denied')) },
    });
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);

    const recorder = new VoiceRecorder();
    await expect(recorder.start()).rejects.toThrow(MicrophonePermissionDeniedError);
  });

  it('stop() encerra a gravação, para as tracks do stream e retorna o áudio capturado', async () => {
    const stream = fakeStream();
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);

    const recorder = new VoiceRecorder();
    await recorder.start();
    const blob = await recorder.stop();

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    expect(recorder.isRecording()).toBe(false);
    expect((stream.getTracks()[0] as unknown as { stop: ReturnType<typeof vi.fn> }).stop).toHaveBeenCalled();
  });

  it('cancel() encerra a gravação sem retornar áudio', async () => {
    const stream = fakeStream();
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);

    const recorder = new VoiceRecorder();
    await recorder.start();
    recorder.cancel();

    expect(recorder.isRecording()).toBe(false);
  });
});
