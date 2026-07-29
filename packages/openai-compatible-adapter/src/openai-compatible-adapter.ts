import type { Model, ModelRequest, ModelResponse, Provider, ProviderHealth } from '@ultron/contracts';
import type { ModelProviderAdapter } from '@ultron/model-gateway';
import { OpenAiCompatibleClient } from './openai-compatible-client.js';

export interface OpenAiCompatibleAdapterOptions {
  /** Identificador estável do provider dentro do Ultron (ex: "ollama-remote"). */
  providerId: string;
  displayName: string;
  baseUrl: string;
  /** Chave/token — nunca logado, nunca persistido fora do keychain do SO. */
  apiKey: string;
  /**
   * Custo por 1M de tokens de entrada/saída, se conhecido — usado para
   * estimar custo real. Se ausente, o custo é reportado como desconhecido
   * (nunca inventado — seção 16 do prompt mestre).
   */
  pricePerMillionTokens?: { input: number; output: number; currency: string };
}

/**
 * Adapter genérico para qualquer endpoint compatível com a API OpenAI
 * (/v1/models, /v1/chat/completions). Cobre tanto um futuro provider OpenAI
 * real quanto gateways de terceiros (ex: Ollama remoto atrás de um proxy
 * compatível, como o endpoint configurado pelo usuário nesta sessão).
 */
export class OpenAiCompatibleAdapter implements ModelProviderAdapter {
  private readonly client: OpenAiCompatibleClient;

  constructor(private readonly options: OpenAiCompatibleAdapterOptions) {
    this.client = new OpenAiCompatibleClient(options.baseUrl, options.apiKey);
  }

  descriptor(): Provider {
    return {
      id: this.options.providerId,
      name: this.options.displayName,
      kind: 'api',
      baseUrl: this.options.baseUrl,
      enabled: true,
    };
  }

  async health(): Promise<ProviderHealth> {
    const startedAt = Date.now();
    try {
      await this.client.listModels();
      return {
        providerId: this.options.providerId,
        ok: true,
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        providerId: this.options.providerId,
        ok: false,
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async listModels(): Promise<Model[]> {
    const response = await this.client.listModels();
    return response.data.map((m) => ({
      id: m.id,
      providerId: this.options.providerId,
      displayName: m.id,
      capabilities: ['text', 'tools'],
      installed: true,
    }));
  }

  async execute(request: ModelRequest, modelId: string): Promise<ModelResponse> {
    const startedAt = Date.now();
    const chatResponse = await this.client.chat(
      modelId,
      request.messages.map((m) => ({ role: m.role, content: m.content })),
    );

    const usage = chatResponse.usage;
    const price = this.options.pricePerMillionTokens;
    const estimatedCost =
      usage && price
        ? {
            currency: price.currency,
            amount:
              (usage.prompt_tokens / 1_000_000) * price.input + (usage.completion_tokens / 1_000_000) * price.output,
          }
        : undefined;

    return {
      decision: { profileId: request.profileId, providerId: this.options.providerId, modelId, reason: '', fallbackUsed: false },
      content: chatResponse.choices[0]?.message.content ?? '',
      tokensIn: usage?.prompt_tokens,
      tokensOut: usage?.completion_tokens,
      latencyMs: Date.now() - startedAt,
      estimatedCost,
    };
  }

  async executeStream(
    request: ModelRequest,
    modelId: string,
    onToken: (token: string) => void,
  ): Promise<ModelResponse> {
    const startedAt = Date.now();
    const chatResponse = await this.client.chatStream(
      modelId,
      request.messages.map((m) => ({ role: m.role, content: m.content })),
      onToken,
    );

    const usage = chatResponse.usage;
    const price = this.options.pricePerMillionTokens;
    const estimatedCost =
      usage && price
        ? {
            currency: price.currency,
            amount:
              (usage.prompt_tokens / 1_000_000) * price.input + (usage.completion_tokens / 1_000_000) * price.output,
          }
        : undefined;

    return {
      decision: { profileId: request.profileId, providerId: this.options.providerId, modelId, reason: '', fallbackUsed: false },
      content: chatResponse.choices[0]?.message.content ?? '',
      tokensIn: usage?.prompt_tokens,
      tokensOut: usage?.completion_tokens,
      latencyMs: Date.now() - startedAt,
      estimatedCost,
    };
  }
}
