import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Face } from './Face.js';

class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Face', () => {
  it('renderiza com role=img e aria-label descrevendo o estado atual', () => {
    render(<Face state="thinking" />);
    expect(screen.getByRole('img', { name: /pensando/i })).toBeDefined();
  });

  it('aplica a classe CSS correspondente ao estado para disparar a animação certa', () => {
    render(<Face state="speaking" />);
    const face = screen.getByRole('img');
    expect(face.className).toContain('ultron-face--speaking');
  });

  it('sempre renderiza visível — não existe opção de ocultar o rosto', () => {
    render(<Face state="idle" />);
    expect(screen.getByRole('img')).toBeDefined();
  });

  it('respeita prefers-reduced-motion do sistema operacional (sem controle manual do usuário)', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );

    render(<Face state="idle" />);
    const face = screen.getByRole('img');
    expect(face.className).toContain('ultron-face--reduced-motion');
  });

  it('cada estado obrigatório produz um aria-label legível e não vazio', () => {
    const states = [
      'idle', 'listening', 'hearing', 'thinking', 'speaking', 'working',
      'success', 'warning', 'error', 'offline', 'sleeping', 'privacy',
      'awaiting_approval', 'interrupted',
    ] as const;

    for (const state of states) {
      const { unmount } = render(<Face state={state} />);
      const face = screen.getByRole('img');
      expect(face.getAttribute('aria-label')).toBeTruthy();
      unmount();
    }
  });
});
