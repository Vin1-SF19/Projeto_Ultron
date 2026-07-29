import { afterEach, describe, expect, it, vi } from 'vitest';
import { AmplitudeLipSyncDriver } from './lip-sync.js';

class FakeAnalyserNode {
  fftSize = 2048;
  frequencyBinCount = 128;
  connect = vi.fn();
  disconnect = vi.fn();
  sample = 128; // 128 = silêncio (amplitude normalizada zero)
  getByteTimeDomainData(array: Uint8Array) {
    array.fill(this.sample);
  }
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  analyser = new FakeAnalyserNode();
  destination = {};
  closed = false;
  state: AudioContextState = 'running';

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createAnalyser() {
    return this.analyser;
  }

  createMediaElementSource() {
    return { connect: vi.fn(), disconnect: vi.fn() };
  }

  close() {
    this.closed = true;
    return Promise.resolve();
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  FakeAudioContext.instances = [];
});

describe('AmplitudeLipSyncDriver', () => {
  it('start() cria o AudioContext e conecta analyser ao destination', () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);

    const onAmplitude = vi.fn();
    const driver = new AmplitudeLipSyncDriver(onAmplitude);
    const audio = document.createElement('audio');

    driver.start({ audio });

    expect(FakeAudioContext.instances).toHaveLength(1);
    expect(FakeAudioContext.instances[0]?.analyser.connect).toHaveBeenCalled();
  });

  it('nunca lança e continua funcionando quando AudioContext não existe no ambiente', () => {
    vi.stubGlobal('AudioContext', undefined);
    const onAmplitude = vi.fn();
    const driver = new AmplitudeLipSyncDriver(onAmplitude);
    const audio = document.createElement('audio');

    expect(() => driver.start({ audio })).not.toThrow();
  });

  it('mede amplitude via setInterval — continua reportando mesmo quando a aba perde o foco (rAF pausaria)', () => {
    vi.useFakeTimers();
    vi.stubGlobal('AudioContext', FakeAudioContext);

    const onAmplitude = vi.fn();
    const driver = new AmplitudeLipSyncDriver(onAmplitude);
    const audio = document.createElement('audio');
    driver.start({ audio });

    // Simula áudio real: amostra != 128 (silêncio) enquanto a voz toca.
    FakeAudioContext.instances[0]!.analyser.sample = 200;

    vi.advanceTimersByTime(200);

    const calls = onAmplitude.mock.calls.map((c) => c[0] as number);
    expect(calls.some((amplitude) => amplitude > 0)).toBe(true);
  });

  it('stop() encerra o AudioContext, para o intervalo e reporta amplitude zero', () => {
    vi.useFakeTimers();
    vi.stubGlobal('AudioContext', FakeAudioContext);

    const onAmplitude = vi.fn();
    const driver = new AmplitudeLipSyncDriver(onAmplitude);
    const audio = document.createElement('audio');
    driver.start({ audio });

    driver.stop();

    expect(FakeAudioContext.instances[0]?.closed).toBe(true);
    expect(onAmplitude).toHaveBeenLastCalledWith(0);

    onAmplitude.mockClear();
    vi.advanceTimersByTime(500);
    expect(onAmplitude).not.toHaveBeenCalled();
  });

  it('update() repassa a amplitude fornecida diretamente ao callback', () => {
    const onAmplitude = vi.fn();
    const driver = new AmplitudeLipSyncDriver(onAmplitude);

    driver.update({ amplitude: 0.75 });

    expect(onAmplitude).toHaveBeenCalledWith(0.75);
  });
});
