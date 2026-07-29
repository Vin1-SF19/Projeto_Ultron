import { z } from 'zod';

/**
 * Domínio de Providers, Modelos e Router (seções 6, 10, 15, 16 do prompt mestre).
 * ProviderCredential nunca guarda o segredo em si — apenas uma referência
 * (secret_ref) para o keychain nativo do SO (seção 7).
 */

export const providerKindSchema = z.enum(['api', 'cli', 'local_runtime', 'oauth_account', 'external_router']);
export type ProviderKind = z.infer<typeof providerKindSchema>;

export const providerSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: providerKindSchema,
  /** Referência ao segredo no keychain do SO — nunca o valor em si. */
  credentialRef: z.string().optional(),
  baseUrl: z.string().optional(),
  enabled: z.boolean(),
});
export type Provider = z.infer<typeof providerSchema>;

export const modelCapabilitySchema = z.enum([
  'text',
  'vision',
  'tools',
  'streaming',
  'embeddings',
  'reasoning',
]);
export type ModelCapability = z.infer<typeof modelCapabilitySchema>;

export const modelSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  displayName: z.string(),
  capabilities: z.array(modelCapabilitySchema),
  contextWindow: z.number().int().positive().optional(),
  /** Presente apenas quando o modelo já está instalado localmente (ex: Ollama). */
  installed: z.boolean().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
});
export type Model = z.infer<typeof modelSchema>;

export const providerHealthSchema = z.object({
  providerId: z.string(),
  ok: z.boolean(),
  checkedAt: z.string().datetime(),
  latencyMs: z.number().nonnegative().optional(),
  detail: z.string().optional(),
});
export type ProviderHealth = z.infer<typeof providerHealthSchema>;

export const routingProfileIdSchema = z.enum([
  'voice-fast',
  'chat-fast',
  'chat-balanced',
  'planning',
  'architecture',
  'coding',
  'testing',
  'code-review',
  'deep-reasoning',
  'vision',
  'document-analysis',
  'private-local',
  'offline',
  'cheap',
  'high-quality',
]);
export type RoutingProfileId = z.infer<typeof routingProfileIdSchema>;

export const routingProfileSchema = z.object({
  id: routingProfileIdSchema,
  requiredCapabilities: z.array(modelCapabilitySchema),
  preferredProviders: z.array(z.string()),
  preferredModels: z.array(z.string()),
  fallbacks: z.array(z.string()),
  maxLatencyMs: z.number().positive().optional(),
  maxCost: z.number().nonnegative().optional(),
  preferLocal: z.boolean().default(false),
});
export type RoutingProfile = z.infer<typeof routingProfileSchema>;

export const modelRequestSchema = z.object({
  profileId: routingProfileIdSchema,
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant', 'tool']),
      content: z.string(),
    }),
  ),
  maxOutputTokens: z.number().int().positive().optional(),
});
export type ModelRequest = z.infer<typeof modelRequestSchema>;

export const routeDecisionSchema = z.object({
  profileId: routingProfileIdSchema,
  providerId: z.string(),
  modelId: z.string(),
  reason: z.string(),
  fallbackUsed: z.boolean(),
});
export type RouteDecision = z.infer<typeof routeDecisionSchema>;

export const modelResponseSchema = z.object({
  decision: routeDecisionSchema,
  content: z.string(),
  tokensIn: z.number().int().nonnegative().optional(),
  tokensOut: z.number().int().nonnegative().optional(),
  latencyMs: z.number().nonnegative(),
  estimatedCost: z
    .object({
      currency: z.string(),
      amount: z.number().nonnegative(),
    })
    .optional(),
});
export type ModelResponse = z.infer<typeof modelResponseSchema>;
