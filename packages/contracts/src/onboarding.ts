import { z } from 'zod';

/**
 * Fluxo de onboarding (seção 43 do prompt mestre). Etapas de voz/notificação
 * da Etapa 9 ficam fora do escopo até a Fase 7 (Voz) existir — a etapa de
 * teste aqui cobre apenas o que já está implementado: chat/modelo e projeto.
 */
export const onboardingStepSchema = z.enum([
  'welcome',
  'diagnostics',
  'assistant',
  'models',
  'openclaw',
  'projects',
  'integrations',
  'security',
  'test',
  'done',
]);
export type OnboardingStep = z.infer<typeof onboardingStepSchema>;

export const onboardingProgressSchema = z.object({
  currentStep: onboardingStepSchema,
  completedSteps: z.array(onboardingStepSchema),
  completedAt: z.string().datetime().optional(),
});
export type OnboardingProgress = z.infer<typeof onboardingProgressSchema>;
