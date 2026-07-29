import { z } from 'zod';

/**
 * Domínio de voz (seção 25 do prompt mestre — síntese/reconhecimento de
 * fala). A credencial em si nunca trafega nesses tipos — apenas a
 * referência ao keychain (secretRef), igual ao domínio de providers de
 * modelo (model-gateway.ts).
 */

export const voiceConfigSchema = z.object({
  configured: z.boolean(),
  voiceId: z.string().optional(),
  voiceName: z.string().optional(),
});
export type VoiceConfig = z.infer<typeof voiceConfigSchema>;

export const voiceOptionSchema = z.object({
  voiceId: z.string(),
  name: z.string(),
  category: z.string(),
  labels: z.record(z.string(), z.string()),
});
export type VoiceOption = z.infer<typeof voiceOptionSchema>;
