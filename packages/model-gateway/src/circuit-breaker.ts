export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
}

/**
 * Circuit breaker por provider: após N falhas consecutivas, o provider é
 * marcado "open" (não tentado) por resetTimeoutMs, depois passa a "half-open"
 * (uma tentativa de teste é permitida) — evita martelar um provider fora do ar.
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private consecutiveFailures = 0;
  private openedAt = 0;

  constructor(private readonly options: CircuitBreakerOptions) {}

  canAttempt(now: number = Date.now()): boolean {
    if (this.state === 'closed') return true;
    if (this.state === 'open' && now - this.openedAt >= this.options.resetTimeoutMs) {
      this.state = 'half-open';
      return true;
    }
    return this.state === 'half-open';
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = 'closed';
  }

  recordFailure(now: number = Date.now()): void {
    this.consecutiveFailures += 1;
    if (this.state === 'half-open' || this.consecutiveFailures >= this.options.failureThreshold) {
      this.state = 'open';
      this.openedAt = now;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}
