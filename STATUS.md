# STATUS DO PROJETO ULTRON

> Arquivo de continuidade. Se o contexto da conversa for perdido/resetado, leia este arquivo primeiro para saber exatamente onde o trabalho parou e o que fazer a seguir.

Última atualização: 2026-07-29 (sessão da tarde, trabalho autônomo)

---

## 1. O QUE É ESTE PROJETO

Superassistente pessoal/profissional local-first ("Projeto Ultron"), especificado em [prompt_Inicial.md](prompt_Inicial.md) (4313 linhas).

Resumo rápido: monólito modular local (Tauri 2 + React no desktop, Control Plane em Node + Fastify + WebSocket + SQLite), com adapters para OpenClaw, Ollama, Claude Code, Codex, routers de modelo, ElevenLabs, Gmail, Calendar, WhatsApp, GitHub. 20 fases de implementação.

Repositório remoto: https://github.com/Vin1-SF19/Projeto_Ultron.git (branches `master`/`develop` sincronizadas; `phase/NN-nome` por fase).

**Nota de autonomia:** o usuário autorizou trabalho autônomo (incluindo instalação de componentes) até as 13h de 2026-07-29 sem pausar para perguntas não-bloqueantes. Retomar o modo normal de confirmação (mostrar antes de instalar/executar ações consequentes) após esse horário, a menos que renovado.

---

## 2. ONDE PARAMOS (ESTADO ATUAL)

**FASE 0 (Auditoria) — CONCLUÍDA.**
**FASE 1 (Fundação do monorepo) — CONCLUÍDA.**
**FASE 2 (Control Plane e Event Bus) — CONCLUÍDA.**
**FASE 3 (OpenClaw Adapter) — CONCLUÍDA e VALIDADA CONTRA GATEWAY REAL.**
**FASE 4 (Providers, modelos e router) — CONCLUÍDA e VALIDADA CONTRA OLLAMA REAL.** Providers pagos (OpenAI/Claude/Codex) ficaram fora do escopo desta fase por exigirem credenciais do usuário (sempre bloqueante).

Próxima fase: **FASE 5 — Onboarding e segredos** (diagnóstico guiado, keychain do SO, configuração de modelos incluindo credenciais pagas, conexão OpenClaw assistida, seleção de pasta de projeto, permissões, teste final).

### O que existe hoje no ambiente (importante para continuar)

- **Ollama instalado** (`Ollama.Ollama` via winget, v0.32.5), rodando como serviço, API HTTP em `127.0.0.1:11434`. Modelo `llama3.2:1b` (1.3GB) baixado e testado com inferência real.
- **OpenClaw CLI instalado** (`openclaw@2026.7.1-2`). Gateway **pode estar rodando** em background (`ws://127.0.0.1:18789`) — verificar com `openclaw gateway status`. Token em `~/.openclaw/openclaw.json` deve ser considerado comprometido (foi exibido em terminal durante debug da Fase 3) — recomendar regenerar antes de uso real além de testes locais.
- **Rust, Cargo, Visual Studio Build Tools** instalados (Fase 1).
- **node:sqlite** nativo em uso, não `better-sqlite3` (ADR-005).

### Checklist Fase 4 (concluída nesta sessão)
- [x] Domínio de modelos/providers em `packages/contracts` (`Provider`, `Model`, `ModelCapability`, `RoutingProfile`, `ModelRequest/Response`, `RouteDecision` — todos com Zod schema).
- [x] `packages/model-gateway`: interface `RoutingEngine` (seção 6 do prompt mestre — `route/execute/stream/health/listProviders/listModels`), `ModelProviderAdapter` (contrato para adapters concretos), `CircuitBreaker` (closed/open/half-open, testado com fake timers), `NativeRoutingEngine` (decide localmente, aplica fallback em ordem de preferência, nunca encadeia routers externos).
- [x] `packages/ollama-adapter`: `OllamaClient` (fetch fino para `/api/tags` e `/api/chat`), `OllamaAdapter` implementando `ModelProviderAdapter`. Nunca instala/baixa modelo automaticamente.
- [x] **Ollama instalado de verdade** (aprovado implicitamente pela autorização de instalar tudo necessário) e **modelo `llama3.2:1b` baixado e testado com inferência real** (resposta correta e latência real ~2.7s em CPU).
- [x] Endpoints no Control Plane: `GET /api/v1/providers`, `GET /api/v1/providers/health`, `GET /api/v1/models`, `POST /api/v1/models/route`, `POST /api/v1/models/execute` (audita sucesso/falha, valida `profileId` com Zod, erro padronizado).
- [x] Perfis de roteamento padrão (`chat-fast`, `chat-balanced`, `coding`, `private-local`, `offline`) apontando para Ollama como único provider configurado.
- [x] **Validado de ponta a ponta com binário real**: `curl` real em todos os endpoints, incluindo `POST /api/v1/models/execute` retornando resposta real do modelo, decisão de rota completa (motivo, fallback, custo explícito R$0,00), e entrada de auditoria registrada.
- [x] [ADR-009](docs/adr/ADR-009-ollama-first-provider.md) documenta a escolha de Ollama como primeiro provider real.
- [x] 26 testes novos (contracts: 5, model-gateway: 10, ollama-adapter: 6, control-plane: +5) — total 63 testes em 8 pacotes, todos passando. Lint/typecheck/build limpos.

## 3. DECISÕES TOMADAS (ADRs)

ADR-001 a ADR-009 — ver [docs/adr/](docs/adr/). Destaque da Fase 4: **ADR-009** (Ollama como primeiro provider, sem credenciais).

## 4. ESTRUTURA DE CÓDIGO ATUAL (para orientação rápida)

```text
packages/
  contracts/           + model-gateway.ts (Provider, Model, RoutingProfile, ModelRequest/Response, RouteDecision)
  database/            node:sqlite, migrations 001 (events) e 002 (audit_events)
  event-bus/           EventBus in-process pub/sub
  openclaw-adapter/     OpenClawAdapter (Fase 3)
  model-gateway/        NOVO na Fase 4 — RoutingEngine, ModelProviderAdapter, CircuitBreaker, NativeRoutingEngine
  ollama-adapter/       NOVO na Fase 4 — OllamaClient + OllamaAdapter

apps/control-plane/src/
  main.ts                 + NativeRoutingEngine com OllamaAdapter, perfis default
  server.ts                + endpoints /providers, /providers/health, /models, /models/route, /models/execute
  routing-config.ts       NOVO — defaultRoutingProfiles()
  integrations-config.ts  loadOpenClawConfig (Fase 3, inalterado)
```

## 5. OBSTÁCULOS REAIS ENCONTRADOS (histórico completo)

**Fase 1:** `better-sqlite3` → `node:sqlite` (ADR-005). Vite + `node:sqlite` → `createRequire`. Rust não linkava → VS Build Tools (ADR-006). Diversos ajustes de config (pino-pretty, eslint deps, tauri.conf pnpm --filter, scripts build faltando).

**Fase 3:** SDK OpenClaw `latest` era placeholder vazio, real estava em `beta` (ADR-007). `clientName` exigia enum `GATEWAY_CLIENT_IDS`. Lock de migração do OpenClaw após kill abrupto. Token exibido acidentalmente em terminal.

**Fase 4:** Nenhum obstáculo técnico relevante — implementação fluiu direto após os aprendizados das fases anteriores (rebuild de `contracts` antes de consumir em `model-gateway`, etc.).

## 6. INCIDENTES OPERACIONAIS REGISTRADOS

1. **Fase 1:** `taskkill //F //IM node.exe` matou 8 processos de uma vez. Lição: sempre `taskkill //PID <pid> //F`.
2. **Fase 3:** `cat ~/.openclaw/openclaw.json` expôs token real em terminal. Lição: nunca `cat` bruto em arquivo de config que pode ter segredo.
3. Ambas as lições foram aplicadas corretamente na Fase 4 (nenhum incidente novo).

## 7. PRÓXIMOS PASSOS IMEDIATOS (ordem)

1. **Commitar a Fase 4** em commits pequenos. Merge `phase/04-providers-models-router` → `develop` → `master`, push.
2. Iniciar **Fase 5 — Onboarding e segredos**: esta fase **vai exigir decisões bloqueantes reais** (credenciais de provider pago, se o usuário quiser conectar OpenAI/Anthropic/etc.) — retomar confirmação explícita antes de pedir/usar qualquer credencial, independentemente de qualquer janela de autonomia vigente (credenciais são sempre bloqueantes, sem exceção, por instrução permanente).
3. Implementar: fluxo de diagnóstico guiado (reaproveitar `environment.ts` já existente), integração com keychain nativo do SO (Windows Credential Manager) para `secret_ref`, tela/endpoint de configuração de modelos, conexão OpenClaw assistida (reaproveitando aprendizados do ADR-008), seleção de pasta de projeto, permissões, teste final do onboarding.
4. Seguir estritamente a ordem das 20 fases.

## 8. REGRAS DE OURO (não esquecer em nenhuma sessão futura)

- Nunca instalar componentes de sistema sem mostrar o que será feito e obter confirmação explícita — **exceto se o usuário tiver concedido uma janela de autonomia explícita e ainda vigente** (verificar timestamp antes de assumir que vale; a desta sessão expira às 13h de 2026-07-29).
- **Credenciais de provider pago são SEMPRE bloqueantes**, mesmo sob janela de autonomia ampla — nunca pedir, gerar, ou usar API keys de OpenAI/Anthropic/etc. sem confirmação explícita e específica para isso.
- Nunca inventar que um comando funcionou — sempre registrar comando, resultado, exit code, erro real.
- Nunca guardar segredos em texto plano no banco — e nunca exibir segredos em output de terminal/log (nem de serviços de terceiros).
- Nunca encerrar processos por nome de imagem genérico — sempre por PID específico.
- Antes de usar qualquer SDK/pacote de terceiro, verificar com `npm view` que a versão real existe e não é um placeholder.
- Um evento nunca deve ser publicado no EventBus antes de estar persistido no Event Store.
- Um erro de listener/assinante nunca deve derrubar outros assinantes nem quem publicou.
- Toda resposta de erro da API segue o envelope `{ error: { code, message, correlationId, details? } }`.
- Toda integração externa é opcional e desligada por padrão — endpoint de status deve reportar erro real honestamente, nunca fingir conexão.
- Nunca encadear dois routers de modelo no mesmo caminho de requisição.
- Nunca instalar/baixar modelo local automaticamente sem confirmação (mesmo sob autonomia ampla, mostrar o que será baixado antes).
- Nunca inventar custo de provider — quando o custo é zero (ex: Ollama local), declarar explicitamente `{ currency, amount: 0 }`, nunca omitir o campo.
- Identidade visual do Ultron deve ser 100% original — ícone atual é placeholder neutro.

---

*Atualize este arquivo ao final de cada fase concluída ou sempre que houver uma mudança relevante de direção, para que qualquer sessão futura possa retomar o trabalho sem perda de contexto.*
