import { z } from 'zod';

export const domainEventSourceSchema = z.object({
  module: z.string(),
  agentId: z.string().optional(),
  providerId: z.string().optional(),
  integrationId: z.string().optional(),
});

export const domainEventSchema = z.object({
  id: z.string(),
  schemaVersion: z.number().int().positive(),
  type: z.string(),
  timestamp: z.string().datetime(),

  aggregateType: z.string(),
  aggregateId: z.string(),

  correlationId: z.string(),
  causationId: z.string().optional(),

  source: domainEventSourceSchema,

  payload: z.unknown(),
});

export type DomainEventSource = z.infer<typeof domainEventSourceSchema>;

export interface DomainEvent<TPayload = unknown> {
  id: string;
  schemaVersion: number;
  type: string;
  timestamp: string;

  aggregateType: string;
  aggregateId: string;

  correlationId: string;
  causationId?: string;

  source: DomainEventSource;

  payload: TPayload;
}
