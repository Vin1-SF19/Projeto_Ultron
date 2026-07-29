import type { RoutingProfile } from '@ultron/contracts';

/**
 * Perfis mínimos da Fase 4. Cada perfil prefere Ollama local por padrão
 * (único provider configurado até que credenciais de providers pagos sejam
 * fornecidas pelo usuário — Fase 5/onboarding). Sem fallback configurado
 * ainda, pois não há um segundo provider disponível nesta fase.
 */
export function defaultRoutingProfiles(): Map<string, RoutingProfile> {
  const profiles: RoutingProfile[] = [
    {
      id: 'chat-fast',
      requiredCapabilities: ['text'],
      preferredProviders: ['ollama'],
      preferredModels: [],
      fallbacks: [],
      preferLocal: true,
    },
    {
      id: 'chat-balanced',
      requiredCapabilities: ['text'],
      preferredProviders: ['ollama'],
      preferredModels: [],
      fallbacks: [],
      preferLocal: true,
    },
    {
      id: 'coding',
      requiredCapabilities: ['text', 'tools'],
      preferredProviders: ['ollama'],
      preferredModels: [],
      fallbacks: [],
      preferLocal: true,
    },
    {
      id: 'private-local',
      requiredCapabilities: ['text'],
      preferredProviders: ['ollama'],
      preferredModels: [],
      fallbacks: [],
      preferLocal: true,
    },
    {
      id: 'offline',
      requiredCapabilities: ['text'],
      preferredProviders: ['ollama'],
      preferredModels: [],
      fallbacks: [],
      preferLocal: true,
    },
  ];

  return new Map(profiles.map((p) => [p.id, p]));
}
