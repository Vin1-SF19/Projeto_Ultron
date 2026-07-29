import type { OpenClawAdapterConfig } from '@ultron/openclaw-adapter';

/**
 * Toda integração externa é opcional e desligada por padrão (seção 34 do
 * prompt mestre). A presença de OPENCLAW_GATEWAY_URL é o que habilita a
 * tentativa de conexão — nunca conectar automaticamente "só porque sim".
 */
export function loadOpenClawConfig(env: NodeJS.ProcessEnv): OpenClawAdapterConfig {
  const url = env.OPENCLAW_GATEWAY_URL;
  return {
    enabled: Boolean(url),
    url: url ?? 'ws://127.0.0.1:18789',
    token: env.OPENCLAW_GATEWAY_TOKEN,
  };
}
