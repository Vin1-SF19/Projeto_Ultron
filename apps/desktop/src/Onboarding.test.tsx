import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { Onboarding } from './Onboarding.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockFetch(handlers: Record<string, () => unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      for (const [suffix, handler] of Object.entries(handlers)) {
        if (url.endsWith(suffix)) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(handler()) });
        }
      }
      return Promise.reject(new Error(`URL/método inesperado: ${init?.method ?? 'GET'} ${url}`));
    }),
  );
}

describe('Onboarding', () => {
  it('carrega o progresso e mostra a etapa welcome', async () => {
    mockFetch({
      '/api/v1/onboarding': () => ({ currentStep: 'welcome', completedSteps: [] }),
    });

    render(<Onboarding onFinished={() => {}} />);

    await waitFor(() => expect(screen.getByText('Bem-vindo')).toBeDefined());
  });

  it('avança para diagnostics ao clicar em Começar', async () => {
    let currentStep = 'welcome';
    mockFetch({
      '/api/v1/onboarding/advance': () => {
        currentStep = 'diagnostics';
        return { currentStep, completedSteps: ['welcome'] };
      },
      '/api/v1/onboarding': () => ({ currentStep, completedSteps: currentStep === 'welcome' ? [] : ['welcome'] }),
      '/api/v1/system/capabilities': () => ({
        environment: {
          platform: 'win32',
          osRelease: '10.0.26200',
          cpuModel: 'CPU teste',
          cpuCores: 4,
          nodeVersion: 'v24.16.0',
        },
      }),
    });

    render(<Onboarding onFinished={() => {}} />);

    await waitFor(() => expect(screen.getByText('Bem-vindo')).toBeDefined());
    screen.getByText('Começar').click();

    await waitFor(() => expect(screen.getByText('Diagnóstico do ambiente')).toBeDefined());
  });

  it('chama onFinished quando o step chega em done', async () => {
    mockFetch({
      '/api/v1/onboarding': () => ({ currentStep: 'done', completedSteps: [] }),
    });
    const onFinished = vi.fn();

    render(<Onboarding onFinished={onFinished} />);

    await waitFor(() => expect(onFinished).toHaveBeenCalled());
  });
});
