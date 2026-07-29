/**
 * Catálogo de tipos de evento de domínio do Ultron.
 * Ver seção 11 de prompt_Inicial.md para a lista completa planejada.
 * Nesta Fase 1, apenas os eventos de sistema necessários para o Control Plane mínimo.
 */
export const SYSTEM_EVENTS = {
  SYSTEM_STARTED: 'system.started',
  SYSTEM_STOPPED: 'system.stopped',
  SYSTEM_HEALTH_CHANGED: 'system.health.changed',
} as const;

export type SystemEventType = (typeof SYSTEM_EVENTS)[keyof typeof SYSTEM_EVENTS];
