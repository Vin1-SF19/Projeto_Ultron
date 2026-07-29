import { z } from 'zod';

/**
 * Domínio de aprovações e níveis de autonomia (seção 22 do prompt mestre).
 * Nesta fase (5), modelamos e persistimos a escolha do usuário. O motor que
 * efetivamente intercepta ações de agentes e cria ApprovalRequest em tempo
 * real chega nas fases de Task Queue/Agent Orchestrator (8, 11) — sem
 * agentes reais executando ainda, não há o que aprovar de fato.
 */

export const autonomyLevelSchema = z.enum([
  'observation',
  'assistance',
  'controlled_execution',
  'bounded_autonomy',
]);
export type AutonomyLevel = z.infer<typeof autonomyLevelSchema>;

export const approvalActionTypeSchema = z.enum([
  'read_sensitive_file',
  'write_file',
  'delete_file',
  'execute_command',
  'execute_privileged_command',
  'install_dependency',
  'install_model',
  'network_request',
  'send_email',
  'send_whatsapp',
  'create_calendar_event',
  'update_calendar_event',
  'delete_calendar_event',
  'git_commit',
  'git_merge',
  'git_push',
  'git_force_operation',
  'access_new_folder',
  'use_paid_provider',
  'exceed_budget',
]);
export type ApprovalActionType = z.infer<typeof approvalActionTypeSchema>;

export const approvalDecisionSchema = z.enum([
  'approve_once',
  'approve_for_task',
  'approve_for_project',
  'always_allow',
  'reject',
]);
export type ApprovalDecisionKind = z.infer<typeof approvalDecisionSchema>;

/**
 * Regra explícita de autonomia delimitada — escopo, duração, orçamento etc.
 * Só é usada quando autonomyLevel === "bounded_autonomy".
 */
export const boundedAutonomyRuleSchema = z.object({
  id: z.string(),
  actionType: approvalActionTypeSchema,
  scope: z.string().optional(),
  projectId: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  maxBudget: z.number().nonnegative().optional(),
  maxActions: z.number().int().positive().optional(),
});
export type BoundedAutonomyRule = z.infer<typeof boundedAutonomyRuleSchema>;

export const autonomyConfigSchema = z.object({
  level: autonomyLevelSchema,
  boundedRules: z.array(boundedAutonomyRuleSchema).default([]),
});
export type AutonomyConfig = z.infer<typeof autonomyConfigSchema>;
