import { z } from 'zod';

/**
 * Domínio mínimo de projeto para a Fase 5 (seleção de pasta). Detecção de
 * stack/Git/scripts/etc. (seção 20 do prompt mestre) é escopo da Fase 9
 * (Project Engine) — aqui só validamos e registramos o caminho escolhido.
 */
export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  addedAt: z.string().datetime(),
});
export type Project = z.infer<typeof projectSchema>;
