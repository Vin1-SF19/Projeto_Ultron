import { describe, expect, it } from 'vitest';
import { CircuitBreaker } from './circuit-breaker.js';

describe('CircuitBreaker', () => {
  it('permite tentativas enquanto fechado', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });
    expect(breaker.canAttempt()).toBe(true);
    expect(breaker.getState()).toBe('closed');
  });

  it('abre após atingir o limite de falhas consecutivas', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 1000 });
    breaker.recordFailure(0);
    expect(breaker.getState()).toBe('closed');
    breaker.recordFailure(0);
    expect(breaker.getState()).toBe('open');
    expect(breaker.canAttempt(0)).toBe(false);
  });

  it('passa a half-open após o timeout, e volta a closed em caso de sucesso', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000 });
    breaker.recordFailure(0);
    expect(breaker.getState()).toBe('open');

    expect(breaker.canAttempt(500)).toBe(false);
    expect(breaker.canAttempt(1500)).toBe(true);
    expect(breaker.getState()).toBe('half-open');

    breaker.recordSuccess();
    expect(breaker.getState()).toBe('closed');
  });

  it('uma falha em half-open reabre imediatamente', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000 });
    breaker.recordFailure(0);
    breaker.canAttempt(1500);
    expect(breaker.getState()).toBe('half-open');

    breaker.recordFailure(1500);
    expect(breaker.getState()).toBe('open');
  });
});
