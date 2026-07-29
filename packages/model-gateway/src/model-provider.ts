import type { Model, ModelRequest, ModelResponse, Provider, ProviderHealth } from '@ultron/contracts';

/**
 * Contrato que cada adapter concreto de provider (Ollama, OpenAI, Claude,
 * Codex...) implementa. O RoutingEngine nativo depende apenas disto, nunca
 * de detalhes de um provider específico.
 */
export interface ModelProviderAdapter {
  descriptor(): Provider;
  health(): Promise<ProviderHealth>;
  listModels(): Promise<Model[]>;
  execute(request: ModelRequest, modelId: string): Promise<ModelResponse>;
  /**
   * Streaming nativo do provider, token a token. Opcional: adapters que não
   * suportam streaming real ficam de fora e o RoutingEngine cai para o
   * comportamento não-incremental de execute().
   */
  executeStream?(request: ModelRequest, modelId: string, onToken: (token: string) => void): Promise<ModelResponse>;
}
