import type { Migration } from '../migrator.js';
import { migration001EventStore } from './001_event_store.js';
import { migration002AuditEvents } from './002_audit_events.js';
import { migration003Providers } from './003_providers.js';

export const allMigrations: Migration[] = [migration001EventStore, migration002AuditEvents, migration003Providers];
