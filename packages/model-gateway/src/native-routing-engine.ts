import type {
  Model,
  ModelRequest,
  ModelResponse,
  Provider,
  ProviderHealth,
  RouteDecision,
  RoutingProfile,
} from '@ultron/contracts';
import { CircuitBreaker } from './circuit-breaker.js';
import type { ModelProviderAdapter } from './model-provider.js';
import type { ModelRunHandle, RoutingEngine, RoutingHealth, StreamCallbacks } from './routing-engine.js';

export class NoProviderAvailableError extends Error {
  constructor(profileId: string) {
    super(`Nenhum provider disponível para o perfil "${profileId}" (preferidos e fallbacks esgotados).`);
    this.name = 'NoProviderAvailableError';
  }
}

export interface NativeRoutingEngineDeps {
  profiles: Map<string, RoutingProfile>;
  adapters: Map<string, ModelProviderAdapter>;
  onDecision?: (decision: RouteDecision) => void;
  circuitBreakerOptions?: { failureThreshold: number; resetTimeoutMs: number };
}

const DEFAULT_CIRCUIT_OPTIONS = { failureThreshold: 3, resetTimeoutMs: 30_000 };

/**
 * Implementação interna do RoutingEngine (ADR-004): decide localmente qual
 * provider/modelo usar com base no RoutingProfile, sem depender de nenhum
 * router externo. Aplica fallback em ordem e circuit breaker por provider.
 */
export class NativeRoutingEngine implements RoutingEngine {
  private readonly breakers = new Map<string, CircuitBreaker>();

  constructor(private readonly deps: NativeRoutingEngineDeps) {}

  private breakerFor(providerId: string): CircuitBreaker {
    let breaker = this.breakers.get(providerId);
    if (!breaker) {
      breaker = new CircuitBreaker(this.deps.circuitBreakerOptions ?? DEFAULT_CIRCUIT_OPTIONS);
      this.breakers.set(providerId, breaker);
    }
    return breaker;
  }

  private getProfile(profileId: string): RoutingProfile {
    const profile = this.deps.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Perfil de roteamento desconhecido: ${profileId}`);
    }
    return profile;
  }

  private async findModel(
    adapter: ModelProviderAdapter,
    preferredModelIds: string[],
  ): Promise<Model | undefined> {
    const models = await adapter.listModels();
    for (const modelId of preferredModelIds) {
      const found = models.find((m) => m.id === modelId);
      if (found) return found;
    }
    return models[0];
  }

  async route(request: ModelRequest): Promise<RouteDecision> {
    const profile = this.getProfile(request.profileId);
    const candidateProviderIds = [...profile.preferredProviders, ...profile.fallbacks];

    let lastError: unknown;

    for (const [index, providerId] of candidateProviderIds.entries()) {
      const adapter = this.deps.adapters.get(providerId);
      if (!adapter) continue;

      const breaker = this.breakerFor(providerId);
      if (!breaker.canAttempt()) continue;

      try {
        const model = await this.findModel(adapter, profile.preferredModels);
        if (!model) continue;

        const decision: RouteDecision = {
          profileId: profile.id,
          providerId,
          modelId: model.id,
          reason:
            index === 0
              ? `provider preferido do perfil "${profile.id}"`
              : `fallback #${index} do perfil "${profile.id}" (preferido indisponível)`,
          fallbackUsed: index > 0,
        };
        this.deps.onDecision?.(decision);
        return decision;
      } catch (error) {
        lastError = error;
        breaker.recordFailure();
      }
    }

    throw lastError instanceof Error ? lastError : new NoProviderAvailableError(request.profileId);
  }

  async execute(request: ModelRequest): Promise<ModelResponse> {
    const decision = await this.route(request);
    const adapter = this.deps.adapters.get(decision.providerId);
    if (!adapter) throw new NoProviderAvailableError(request.profileId);

    const breaker = this.breakerFor(decision.providerId);
    try {
      const response = await adapter.execute(request, decision.modelId);
      breaker.recordSuccess();
      return { ...response, decision };
    } catch (error) {
      breaker.recordFailure();
      throw error;
    }
  }

  async stream(request: ModelRequest, callbacks: StreamCallbacks): Promise<ModelRunHandle> {
    let cancelled = false;
    this.execute(request)
      .then((response) => {
        if (cancelled) return;
        callbacks.onDone?.(response);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      });

    return {
      cancel: () => {
        cancelled = true;
      },
    };
  }

  async health(): Promise<RoutingHealth> {
    const providers: ProviderHealth[] = [];
    for (const adapter of this.deps.adapters.values()) {
      providers.push(await adapter.health());
    }
    return { providers };
  }

  async listProviders(): Promise<Provider[]> {
    return [...this.deps.adapters.values()].map((adapter) => adapter.descriptor());
  }

  async listModels(): Promise<Model[]> {
    const all: Model[] = [];
    for (const adapter of this.deps.adapters.values()) {
      all.push(...(await adapter.listModels()));
    }
    return all;
  }
}
