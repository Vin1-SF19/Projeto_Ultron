import type { SqliteDatabase } from '@ultron/database';
import type { OnboardingProgress, OnboardingStep } from '@ultron/contracts';

interface OnboardingRow {
  current_step: string;
  completed_steps: string;
  completed_at: string | null;
}

/**
 * Persiste o progresso do onboarding (seção 43 do prompt mestre — "o
 * onboarding deve poder ser retomado"). Uma única linha (singleton),
 * como autonomy_config.
 */
export class OnboardingStore {
  constructor(private readonly db: SqliteDatabase) {}

  get(): OnboardingProgress {
    const row = this.db.prepare('SELECT * FROM onboarding_progress WHERE id = 1').get() as unknown as OnboardingRow;
    return {
      currentStep: row.current_step as OnboardingStep,
      completedSteps: JSON.parse(row.completed_steps) as OnboardingStep[],
      completedAt: row.completed_at ?? undefined,
    };
  }

  advance(completedStep: OnboardingStep, nextStep: OnboardingStep): OnboardingProgress {
    const current = this.get();
    const completedSteps = current.completedSteps.includes(completedStep)
      ? current.completedSteps
      : [...current.completedSteps, completedStep];

    const completedAt = nextStep === 'done' ? new Date().toISOString() : null;

    this.db
      .prepare(
        "UPDATE onboarding_progress SET current_step = ?, completed_steps = ?, completed_at = ?, updated_at = datetime('now') WHERE id = 1",
      )
      .run(nextStep, JSON.stringify(completedSteps), completedAt);

    return this.get();
  }

  reset(): OnboardingProgress {
    this.db
      .prepare(
        "UPDATE onboarding_progress SET current_step = 'welcome', completed_steps = '[]', completed_at = NULL, updated_at = datetime('now') WHERE id = 1",
      )
      .run();
    return this.get();
  }
}
