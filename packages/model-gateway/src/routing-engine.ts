import type {
  Model,
  ModelRequest,
  ModelResponse,
  Provider,
  ProviderHealth,
  RouteDecision,
} from '@ultron/contracts';

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onDone?: (response: ModelResponse) => void;
  onError?: (error: Error) => void;
}

export interface ModelRunHandle {
  cancel: () => void;
}

export interface RoutingHealth {
  providers: ProviderHealth[];
}

/**
 * Interface interna de roteamento de modelos (seção 6 do prompt mestre).
 * Nenhum código de domínio deve depender diretamente de um router externo
 * (claude-code-router, OmniRoute) — apenas desta interface. Ver ADR-004.
 */
export interface RoutingEngine {
  route(request: ModelRequest): Promise<RouteDecision>;
  execute(request: ModelRequest): Promise<ModelResponse>;
  stream(request: ModelRequest, callbacks: StreamCallbacks): Promise<ModelRunHandle>;
  health(): Promise<RoutingHealth>;
  listProviders(): Promise<Provider[]>;
  listModels(): Promise<Model[]>;
}
