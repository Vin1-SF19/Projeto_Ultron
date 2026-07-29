import { describe, expect, it } from 'vitest';
import { providerSchema, modelSchema, routingProfileSchema, routeDecisionSchema } from './model-gateway.js';

describe('model-gateway schemas', () => {
  it('aceita um provider válido sem credentialRef (não obrigatório)', () => {
    const provider = { id: 'ollama', name: 'Ollama', kind: 'local_runtime', enabled: true };
    expect(() => providerSchema.parse(provider)).not.toThrow();
  });

  it('rejeita provider com kind inválido', () => {
    const provider = { id: 'x', name: 'X', kind: 'invalido', enabled: true };
    expect(() => providerSchema.parse(provider)).toThrow();
  });

  it('aceita um modelo válido', () => {
    const model = {
      id: 'llama3.1:8b',
      providerId: 'ollama',
      displayName: 'Llama 3.1 8B',
      capabilities: ['text', 'tools'],
      installed: true,
    };
    expect(() => modelSchema.parse(model)).not.toThrow();
  });

  it('aceita um perfil de roteamento válido', () => {
    const profile = {
      id: 'chat-fast',
      requiredCapabilities: ['text'],
      preferredProviders: ['ollama'],
      preferredModels: ['llama3.1:8b'],
      fallbacks: [],
      preferLocal: true,
    };
    expect(() => routingProfileSchema.parse(profile)).not.toThrow();
  });

  it('aceita uma decisão de rota válida', () => {
    const decision = {
      profileId: 'chat-fast',
      providerId: 'ollama',
      modelId: 'llama3.1:8b',
      reason: 'perfil prefere local',
      fallbackUsed: false,
    };
    expect(() => routeDecisionSchema.parse(decision)).not.toThrow();
  });
});
