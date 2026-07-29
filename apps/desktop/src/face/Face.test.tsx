import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Face } from './Face.js';

afterEach(() => {
  cleanup();
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

  it('quando hidden=true, não renderiza nada (opção de ocultar rosto)', () => {
    render(<Face state="idle" hidden />);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('modo sem animação aplica a classe ultron-face--anim-none', () => {
    render(<Face state="idle" animationIntensity="none" />);
    const face = screen.getByRole('img');
    expect(face.className).toContain('ultron-face--anim-none');
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
