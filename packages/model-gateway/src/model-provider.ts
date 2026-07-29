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
}
