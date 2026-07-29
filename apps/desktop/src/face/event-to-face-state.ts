import type { FaceState } from './face-state.js';

/**
 * Mapeamento de tipos de evento de domínio (DomainEvent.type) para o estado
 * de rosto correspondente (seção 24 do prompt mestre). Eventos sem mapeamento
 * conhecido não alteram o rosto — nunca inventar uma reação para um evento
 * que não foi explicitamente decidido.
 */
const EVENT_TYPE_TO_FACE_STATE: Record<string, FaceState> = {
  'voice.listening.started': 'listening',
  'voice.transcript.partial': 'hearing',
  'model.request.started': 'thinking',
  'model_stream_start': 'thinking',
  'model_stream_token': 'speaking',
  'voice.response.started': 'speaking',
  'task.started': 'working',
  'task.completed': 'success',
  'model_stream_done': 'success',
  'task.failed': 'error',
  'model_stream_error': 'error',
  'approval.created': 'awaiting_approval',
  'system.offline': 'offline',
  'system.stopped': 'offline',
  'voice.response.ended': 'idle',
  'voice.response.error': 'error',
};

export function faceStateForEvent(eventType: string): FaceState | undefined {
  return EVENT_TYPE_TO_FACE_STATE[eventType];
}
