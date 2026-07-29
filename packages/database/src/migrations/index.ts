import type { Migration } from '../migrator.js';
import { migration001EventStore } from './001_event_store.js';

export const allMigrations: Migration[] = [migration001EventStore];
