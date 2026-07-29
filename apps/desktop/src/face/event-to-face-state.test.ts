import { describe, expect, it } from 'vitest';
import { faceStateForEvent } from './event-to-face-state.js';

describe('faceStateForEvent', () => {
  it('mapeia eventos reais de voz/modelo/tarefa para o estado correspondente (exemplos da seção 24)', () => {
    expect(faceStateForEvent('voice.listening.started')).toBe('listening');
    expect(faceStateForEvent('voice.transcript.partial')).toBe('hearing');
    expect(faceStateForEvent('model.request.started')).toBe('thinking');
    expect(faceStateForEvent('voice.response.started')).toBe('speaking');
    expect(faceStateForEvent('task.started')).toBe('working');
    expect(faceStateForEvent('task.completed')).toBe('success');
    expect(faceStateForEvent('task.failed')).toBe('error');
    expect(faceStateForEvent('approval.created')).toBe('awaiting_approval');
    expect(faceStateForEvent('system.offline')).toBe('offline');
  });

  it('mapeia os eventos de streaming do Control Plane usados pelo chat', () => {
    expect(faceStateForEvent('model_stream_start')).toBe('thinking');
    expect(faceStateForEvent('model_stream_token')).toBe('speaking');
    expect(faceStateForEvent('model_stream_done')).toBe('success');
    expect(faceStateForEvent('model_stream_error')).toBe('error');
  });

  it('retorna undefined para eventos sem mapeamento — nunca inventa uma reação', () => {
    expect(faceStateForEvent('algum.evento.desconhecido')).toBeUndefined();
  });
});
