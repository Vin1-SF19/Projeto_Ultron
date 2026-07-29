import type { RoutingProfile } from '@ultron/contracts';

/**
 * Perfis default. "ollama" (local, sempre presente) é o fallback universal —
 * funciona offline e sem credencial. "ollama-remoto" é um provider extra
 * específico deste ambiente (configurado via POST /api/v1/providers/config
 * pelo usuário, apontando para um Ollama remoto mais forte, modelos 30B-35B).
 * Perfis que exigem mais qualidade preferem o remoto com fallback local;
 * perfis que exigem privacidade/offline nunca saem do local.
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
      preferredProviders: ['ollama-remoto'],
      preferredModels: ['qwen3-coder:30b'],
      fallbacks: ['ollama'],
      preferLocal: false,
    },
    {
      id: 'deep-reasoning',
      requiredCapabilities: ['text'],
      preferredProviders: ['ollama-remoto'],
      preferredModels: ['qwen3.6:35b'],
      fallbacks: ['ollama'],
      preferLocal: false,
    },
    {
      id: 'high-quality',
      requiredCapabilities: ['text'],
      preferredProviders: ['ollama-remoto'],
      preferredModels: [],
      fallbacks: ['ollama'],
      preferLocal: false,
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
