/**
 * Estados obrigatórios do rosto (seção 24 do prompt mestre). Cada estado é
 * acionado por eventos reais do Control Plane — nunca por transições
 * decorativas sem relação com o que está de fato acontecendo.
 */
export const FACE_STATES = [
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
] as const;

export type FaceState = (typeof FACE_STATES)[number];

export function isFaceState(value: string): value is FaceState {
  return (FACE_STATES as readonly string[]).includes(value);
}
