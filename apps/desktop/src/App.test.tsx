import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { App } from './App.js';

class FakeWebSocket {
  addEventListener() {}
  send() {}
  close() {}
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// jsdom não implementa canvas — o rosto usa Canvas para o campo de
// partículas, mas já trata ctx nulo com segurança (ver ParticleField.tsx).
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null) as unknown as typeof HTMLCanvasElement.prototype.getContext;

describe('App', () => {
  it('mostra estado desconectado quando o Control Plane não responde', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('conexão recusada')),
    );

    render(<App />);

    await waitFor(() => expect(screen.getByText('desconectado')).toBeDefined());
    expect(screen.getByText(/Não disponível nesta versão/)).toBeDefined();
  });

  it('mostra a Home (rosto, chat e navegação) quando conectado e onboarding concluído', async () => {
    vi.stubGlobal('WebSocket', FakeWebSocket);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/health')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok', uptimeSeconds: 10 }) });
        }
        if (url.endsWith('/api/v1/system/status')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                status: 'ok',
                version: '0.1.0',
                startedAt: new Date().toISOString(),
                uptimeSeconds: 10,
                database: { filePath: 'C:/fake/ultron.sqlite' },
              }),
          });
        }
        if (url.endsWith('/api/v1/system/capabilities')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                environment: {
                  platform: 'win32',
                  osRelease: '10.0.26200',
                  arch: 'x64',
                  cpuModel: 'CPU de teste',
                  cpuCores: 8,
                  totalMemoryBytes: 16 * 1024 ** 3,
                  freeMemoryBytes: 8 * 1024 ** 3,
                  nodeVersion: 'v24.16.0',
                  uptimeSeconds: 10,
                },
              }),
          });
        }
        if (url.endsWith('/api/v1/onboarding')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ currentStep: 'done', completedSteps: [] }),
          });
        }
        if (url.endsWith('/api/v1/projects')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ projects: [] }) });
        }
        return Promise.reject(new Error(`URL inesperada: ${url}`));
      }),
    );

    render(<App />);

    await waitFor(() => expect(screen.getByRole('img', { name: /rosto do ultron/i })).toBeDefined());
    expect(screen.getByRole('navigation', { name: /navegação principal/i })).toBeDefined();
    expect(screen.getByLabelText('Mensagem para o Ultron')).toBeDefined();
  });

  it('mostra o onboarding quando ainda não foi concluído', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/health')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok', uptimeSeconds: 10 }) });
        }
        if (url.endsWith('/api/v1/system/status')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                status: 'ok',
                version: '0.1.0',
                startedAt: new Date().toISOString(),
                uptimeSeconds: 10,
                database: { filePath: 'C:/fake/ultron.sqlite' },
              }),
          });
        }
        if (url.endsWith('/api/v1/system/capabilities')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                environment: {
                  platform: 'win32',
                  osRelease: '10.0.26200',
                  arch: 'x64',
                  cpuModel: 'CPU de teste',
                  cpuCores: 8,
                  totalMemoryBytes: 16 * 1024 ** 3,
                  freeMemoryBytes: 8 * 1024 ** 3,
                  nodeVersion: 'v24.16.0',
                  uptimeSeconds: 10,
                },
              }),
          });
        }
        if (url.endsWith('/api/v1/onboarding')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ currentStep: 'welcome', completedSteps: [] }),
          });
        }
        return Promise.reject(new Error(`URL inesperada: ${url}`));
      }),
    );

    render(<App />);

    await waitFor(() => expect(screen.getByText('Bem-vindo')).toBeDefined());
    expect(screen.getByText('Configuração inicial do Ultron')).toBeDefined();
  });
});
