import { describe, expect, it } from 'vitest';
import { onboardingProgressSchema } from './onboarding.js';

describe('onboardingProgressSchema', () => {
  it('aceita progresso inicial válido', () => {
    expect(() =>
      onboardingProgressSchema.parse({ currentStep: 'welcome', completedSteps: [] }),
    ).not.toThrow();
  });

  it('rejeita step inválido', () => {
    expect(() =>
      onboardingProgressSchema.parse({ currentStep: 'inexistente', completedSteps: [] }),
    ).toThrow();
  });
});
