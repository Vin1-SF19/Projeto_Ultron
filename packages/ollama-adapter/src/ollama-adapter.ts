import type { Model, ModelCapability, ModelRequest, ModelResponse, Provider, ProviderHealth } from '@ultron/contracts';
import type { ModelProviderAdapter } from '@ultron/model-gateway';
import { OllamaClient } from './ollama-client.js';

const DEFAULT_BASE_URL = 'http://127.0.0.1:11434';

function mapCapabilities(raw: string[] | undefined): ModelCapability[] {
  const caps: ModelCapability[] = ['text'];
  if (raw?.includes('tools')) caps.push('tools');
  if (raw?.includes('vision') || raw?.includes('completion:vision')) caps.push('vision');
  if (raw?.includes('embedding')) caps.push('embeddings');
  return caps;
}

export interface OllamaAdapterOptions {
  baseUrl?: string;
}

/**
 * Adapter para Ollama (modelos locais). Nunca instala/baixa modelo
 * automaticamente — apenas lista o que já está instalado (seção 14 do
 * prompt mestre: instalar somente mediante confirmação).
 */
export class OllamaAdapter implements ModelProviderAdapter {
  private readonly client: OllamaClient;
  private readonly baseUrl: string;

  constructor(options: OllamaAdapterOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.client = new OllamaClient(this.baseUrl);
  }

  descriptor(): Provider {
    return { id: 'ollama', name: 'Ollama', kind: 'local_runtime', baseUrl: this.baseUrl, enabled: true };
  }

  async health(): Promise<ProviderHealth> {
    const startedAt = Date.now();
    try {
      await this.client.listTags();
      return {
        providerId: 'ollama',
        ok: true,
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        providerId: 'ollama',
        ok: false,
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async listModels(): Promise<Model[]> {
    const tags = await this.client.listTags();
    return tags.models.map((m) => ({
      id: m.model,
      providerId: 'ollama',
      displayName: m.name,
      capabilities: mapCapabilities(m.capabilities),
      installed: true,
      sizeBytes: m.size,
    }));
  }

  async execute(request: ModelRequest, modelId: string): Promise<ModelResponse> {
    const startedAt = Date.now();
    const chatResponse = await this.client.chat(
      modelId,
      request.messages.map((m) => ({ role: m.role, content: m.content })),
    );

    return {
      decision: { profileId: request.profileId, providerId: 'ollama', modelId, reason: '', fallbackUsed: false },
      content: chatResponse.message.content,
      tokensIn: chatResponse.prompt_eval_count,
      tokensOut: chatResponse.eval_count,
      latencyMs: Date.now() - startedAt,
      // Ollama é local — custo monetário é zero, mas registramos explicitamente
      // em vez de omitir (nunca inventar preço, seção 16 do prompt mestre).
      estimatedCost: { currency: 'BRL', amount: 0 },
    };
  }
}
