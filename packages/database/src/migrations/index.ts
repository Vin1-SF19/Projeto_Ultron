import type { Migration } from '../migrator.js';
import { migration001EventStore } from './001_event_store.js';
import { migration002AuditEvents } from './002_audit_events.js';
import { migration003Providers } from './003_providers.js';
import { migration004AutonomyConfig } from './004_autonomy_config.js';
import { migration005Projects } from './005_projects.js';
import { migration006OnboardingProgress } from './006_onboarding_progress.js';

export const allMigrations: Migration[] = [
  migration001EventStore,
  migration002AuditEvents,
  migration003Providers,
  migration004AutonomyConfig,
  migration005Projects,
  migration006OnboardingProgress,
];
