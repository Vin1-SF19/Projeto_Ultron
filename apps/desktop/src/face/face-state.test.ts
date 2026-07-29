import { describe, expect, it } from 'vitest';
import { FACE_STATES, isFaceState } from './face-state.js';

describe('face-state', () => {
  it('define exatamente os 14 estados obrigatórios da seção 24 do prompt mestre', () => {
    expect(FACE_STATES).toEqual([
      'idle',
      'listening',
      'hearing',
      'thinking',
      'speaking',
      'working',
      'success',
      'warning',
      'error',
      'offline',
      'sleeping',
      'privacy',
      'awaiting_approval',
      'interrupted',
    ]);
  });

  it('isFaceState valida corretamente valores conhecidos e desconhecidos', () => {
    expect(isFaceState('thinking')).toBe(true);
    expect(isFaceState('happy')).toBe(false);
  });
});
