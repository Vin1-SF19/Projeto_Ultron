import type { SqliteDatabase } from '@ultron/database';
import type { AutonomyConfig, AutonomyLevel, BoundedAutonomyRule } from '@ultron/contracts';

interface AutonomyRow {
  level: string;
}

interface RuleRow {
  id: string;
  action_type: string;
  scope: string | null;
  project_id: string | null;
  expires_at: string | null;
  max_budget: number | null;
  max_actions: number | null;
}

/**
 * Persiste o nível de autonomia escolhido pelo usuário e as regras de
 * autonomia delimitada (seção 22 do prompt mestre). Este é o armazenamento
 * de configuração — o motor que efetivamente intercepta ações de agentes
 * e consulta esta config chega junto com o Agent Orchestrator (Fase 11).
 */
export class AutonomyConfigStore {
  constructor(private readonly db: SqliteDatabase) {}

  get(): AutonomyConfig {
    const row = this.db.prepare('SELECT level FROM autonomy_config WHERE id = 1').get() as unknown as AutonomyRow;
    const rules = this.db.prepare('SELECT * FROM bounded_autonomy_rules').all() as unknown as RuleRow[];

    return {
      level: row.level as AutonomyLevel,
      boundedRules: rules.map((r) => ({
        id: r.id,
        actionType: r.action_type as BoundedAutonomyRule['actionType'],
        scope: r.scope ?? undefined,
        projectId: r.project_id ?? undefined,
        expiresAt: r.expires_at ?? undefined,
        maxBudget: r.max_budget ?? undefined,
        maxActions: r.max_actions ?? undefined,
      })),
    };
  }

  setLevel(level: AutonomyLevel): void {
    this.db
      .prepare("UPDATE autonomy_config SET level = ?, updated_at = datetime('now') WHERE id = 1")
      .run(level);
  }

  addBoundedRule(rule: BoundedAutonomyRule): void {
    this.db
      .prepare(
        `INSERT INTO bounded_autonomy_rules (id, action_type, scope, project_id, expires_at, max_budget, max_actions)
         VALUES (@id, @action_type, @scope, @project_id, @expires_at, @max_budget, @max_actions)
         ON CONFLICT(id) DO UPDATE SET
           action_type = excluded.action_type,
           scope = excluded.scope,
           project_id = excluded.project_id,
           expires_at = excluded.expires_at,
           max_budget = excluded.max_budget,
           max_actions = excluded.max_actions`,
      )
      .run({
        id: rule.id,
        action_type: rule.actionType,
        scope: rule.scope ?? null,
        project_id: rule.projectId ?? null,
        expires_at: rule.expiresAt ?? null,
        max_budget: rule.maxBudget ?? null,
        max_actions: rule.maxActions ?? null,
      });
  }

  removeBoundedRule(ruleId: string): void {
    this.db.prepare('DELETE FROM bounded_autonomy_rules WHERE id = ?').run(ruleId);
  }
}
