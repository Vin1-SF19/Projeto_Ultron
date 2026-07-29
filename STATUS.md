# STATUS DO PROJETO ULTRON

> Arquivo de continuidade. Se o contexto da conversa for perdido/resetado, leia este arquivo primeiro para saber exatamente onde o trabalho parou e o que fazer a seguir.

Última atualização: 2026-07-29 (sessão da tarde)

---

## 1. O QUE É ESTE PROJETO

Superassistente pessoal/profissional local-first ("Projeto Ultron"), especificado em [prompt_Inicial.md](prompt_Inicial.md) (4313 linhas).

Resumo rápido: monólito modular local (Tauri 2 + React no desktop, Control Plane em Node + Fastify + WebSocket + SQLite), com adapters para OpenClaw, Ollama, Claude Code, Codex, routers de modelo, ElevenLabs, Gmail, Calendar, WhatsApp, GitHub. 20 fases de implementação.

Repositório remoto: https://github.com/Vin1-SF19/Projeto_Ultron.git (branches `master`/`develop` sincronizadas; `phase/NN-nome` por fase).

**Nota de autonomia (2026-07-29, tarde):** o usuário autorizou trabalho autônomo até as 13h sem pausar para perguntas não-bloqueantes — só interromper para decisões genuinamente bloqueantes (perda de dados, credencial, pagamento, instalação privilegiada, infraestrutura existente, acesso externo, identidade visual, irreversibilidade). Verificar se essa janela de autonomia ainda está em vigor antes de assumir que continua valendo em sessões futuras.

---

## 2. ONDE PARAMOS (ESTADO ATUAL)

**FASE 0 (Auditoria) — CONCLUÍDA.**
**FASE 1 (Fundação do monorepo) — CONCLUÍDA.**
**FASE 2 (Control Plane e Event Bus) — CONCLUÍDA.**
**FASE 3 (OpenClaw Adapter) — CONCLUÍDA e VALIDADA CONTRA GATEWAY REAL.**

Próxima fase: **FASE 4 — Providers, modelos e router** (Provider SDK, Ollama, OpenAI, Claude, Codex, health, perfis, fallback, circuit breaker, custos, UI de modelos).

### O que existe hoje no ambiente (importante para continuar)

- **OpenClaw CLI instalado globalmente** via npm (`openclaw@2026.7.1-2`). Config em `~/.openclaw/openclaw.json` (auth mode `token`, token gerado — **considerar comprometido**, foi exibido em terminal durante debug; recomendar regenerar antes de uso real).
- **Gateway OpenClaw pode estar rodando em background** (processo `openclaw gateway run`, escutando em `ws://127.0.0.1:18789`, loopback-only). Verificar com `openclaw gateway status` antes de assumir que está no ar — pode ter sido encerrado entre sessões.
- **Rust, Cargo, Visual Studio Build Tools** instalados (Fase 1, ADR-006).
- **node:sqlite** nativo em uso, não `better-sqlite3` (ADR-005).

### Checklist Fase 3 (concluída nesta sessão)
- [x] Pesquisa técnica do protocolo OpenClaw Gateway (WebSocket, porta 18789, handshake por challenge, protocolo wire v4).
- [x] **Descoberta crítica via `npm view` direto (não só documentação):** a tag `latest` de `@openclaw/gateway-client`/`@openclaw/gateway-protocol` é um placeholder vazio (`0.0.0`, "Reserved package name"); o SDK real e funcional só existe na tag `beta` (`2026.7.2-beta.5`). Ver [ADR-007](docs/adr/ADR-007-openclaw-sdk.md).
- [x] `packages/openclaw-adapter` criado, usando o SDK oficial (`GatewayClient`) pinado na versão exata `2026.7.2-beta.5`.
- [x] `OpenClawAdapter`: nunca conecta sem `enabled: true` explícito (integração opcional por padrão); usa protocolo v4; nunca loga o token (testado explicitamente); estados `disabled/connecting/connected/reconnecting/disconnected/error`; `health()` via `client.request('status', {})`; `disconnect()` limpo.
- [x] Camada anticorrupção (`event-mapper.ts`): todo evento do Gateway vira `DomainEvent` do tipo `integration.openclaw.<evento>`, `aggregateType: 'integration'`, `source.integrationId: 'openclaw'` — nenhuma camada acima conhece o formato bruto do OpenClaw.
- [x] Integrado ao Control Plane: endpoint `GET /api/v1/integrations/openclaw/status` (reporta `disabled` honestamente quando não configurado — nunca finge conexão); eventos do adapter fluem para o `EventStore` como qualquer outro evento de domínio; `disconnect()` chamado no shutdown gracioso.
- [x] Configuração via env vars: `OPENCLAW_GATEWAY_URL` (presença = habilita), `OPENCLAW_GATEWAY_TOKEN`.
- [x] **Instalado o OpenClaw de verdade** (aprovado pelo usuário) e **validado o adapter contra um Gateway real rodando**: conectou, recebeu e traduziu eventos reais (`integration.openclaw.health`, `integration.openclaw.tick`) com métricas reais de event loop, persistiu no Event Store, endpoint de status reportou erro real e específico (`missing scope: operator.read`) em vez de sucesso fingido.
- [x] [ADR-008](docs/adr/ADR-008-openclaw-onboarding-flow.md) documenta o fluxo real de onboarding observado empiricamente (não estava na doc pública): comandos não-interativos, comportamento de lock de migração, escopos padrão restritos, etc.
- [x] 11 testes novos no `openclaw-adapter` (mock do SDK) + 1 teste novo no `control-plane` (endpoint de status) — total 37 testes em 6 pacotes, todos passando. Lint/typecheck/build limpos.

## 3. DECISÕES TOMADAS (ADRs)

ADR-001 a ADR-008 — ver [docs/adr/](docs/adr/). Destaques da Fase 3:
- **ADR-007**: usar SDK oficial do OpenClaw (não reimplementar protocolo), pinado na tag `beta` exata (não `latest`, que está vazio).
- **ADR-008**: comportamento real de onboarding/autenticação do OpenClaw, observado empiricamente (não documentado publicamente).

## 4. ESTRUTURA DE CÓDIGO ATUAL (para orientação rápida)

```text
packages/
  contracts/          DomainEvent (Zod + TS)
  database/           node:sqlite, migrator, migrations 001 (events) e 002 (audit_events)
  event-bus/           EventBus in-process pub/sub
  openclaw-adapter/    NOVO na Fase 3 — OpenClawAdapter + camada anticorrupção
    src/types.ts             config e tipos do adapter
    src/event-mapper.ts      tradução OpenClaw -> DomainEvent
    src/openclaw-adapter.ts  classe principal (usa @openclaw/gateway-client)

apps/control-plane/src/
  main.ts                 bootstrap: instancia OpenClawAdapter, conecta se habilitado, disconnect() no shutdown
  server.ts                + endpoint GET /api/v1/integrations/openclaw/status
  integrations-config.ts  NOVO — loadOpenClawConfig(env) a partir de OPENCLAW_GATEWAY_URL/TOKEN
  event-store.ts, audit-log.ts, errors.ts, logger.ts, environment.ts  (inalterados desde Fase 2)

apps/desktop/src/          (inalterado desde Fase 1 — tela de status ainda não mostra integrações)
```

## 5. OBSTÁCULOS REAIS ENCONTRADOS (histórico completo, para não repetir investigação)

**Fase 1:** `better-sqlite3` não compilava → `node:sqlite` (ADR-005). Vite não reconhece `node:sqlite` → `createRequire`. Rust não linkava → instalado VS Build Tools (ADR-006). `pino-pretty` ausente, `eslint.config.js` sem deps, `tauri.conf.json` com `pnpm --dir` errado, pacotes sem script `build` — todos corrigidos.

**Fase 3:**
- SDK oficial do OpenClaw parecia não existir de verdade (`npm view` mostrava `0.0.0`) — investigação mais funda (`npm view @pacote@beta`, `npm pack` + leitura do README real dentro do tarball) revelou que o código real está na tag `beta`.
- `clientName: 'ultron-control-plane'` não tipava — `GatewayClientOptions.clientName` exige um `GatewayClientId` do enum `GATEWAY_CLIENT_IDS`; usado `NODE_HOST` ("node-host").
- `openclaw gateway run` matado abruptamente (timeout) deixou lock de "startup migrations already running" — resolvido aguardando o timeout indicado na própria mensagem de erro (não havia comando de limpeza manual encontrado).
- Token do OpenClaw acidentalmente exibido em output de terminal durante debug — tratado como comprometido, usuário deve regenerar antes de uso real.

## 6. INCIDENTES OPERACIONAIS REGISTRADOS

1. **Fase 1:** `taskkill //F //IM node.exe` matou 8 processos node de uma vez. Lição aplicada: sempre `taskkill //PID <pid> //F`.
2. **Fase 3:** comando `cat ~/.openclaw/openclaw.json` expôs o token de autenticação real no output do terminal (visível no histórico da conversa). Token é local/loopback-only, mas deve ser tratado como comprometido. **Lição: ao inspecionar arquivos de config que podem conter segredos, sempre filtrar/redactar antes de exibir, nunca fazer `cat` bruto.**

## 7. PRÓXIMOS PASSOS IMEDIATOS (ordem)

1. **Commitar a Fase 3** em commits pequenos (ex: `feat(openclaw-adapter): add adapter using official SDK`, `feat(control-plane): integrate OpenClawAdapter with status endpoint`, `docs(adr): document OpenClaw SDK and onboarding findings`). Merge `phase/03-openclaw-adapter` → `develop` → `master`, push.
2. Iniciar **Fase 4 — Providers, modelos e router**: criar a interface `RoutingEngine` (seção 6 do prompt mestre), `NativeRoutingEngine`, e o primeiro provider real (candidato natural: Ollama, já que não depende de credenciais pagas — verificar se está instalado localmente antes, senão será necessário pedir aprovação para instalar, como fizemos com Rust/VS Build Tools/OpenClaw).
3. Antes de conectar qualquer provider pago (OpenAI, Anthropic API direta, etc.), **isso exigirá credencial do usuário — sempre uma pausa bloqueante**, mesmo dentro de uma janela de autonomia ampla.
4. Seguir estritamente a ordem das 20 fases.

## 8. REGRAS DE OURO (não esquecer em nenhuma sessão futura)

- Nunca instalar componentes de sistema sem mostrar o que será feito e obter confirmação explícita — **exceto se o usuário tiver concedido uma janela de autonomia explícita e ainda vigente** (verificar timestamp/contexto antes de assumir que vale).
- Nunca inventar que um comando funcionou — sempre registrar comando, resultado, exit code, erro real.
- Nunca guardar segredos em texto plano no banco (usar `secret_ref` + keychain do SO) — e nunca exibir segredos em output de terminal/log, nem os de serviços de terceiros (ex: `cat` em arquivo de config sem filtrar).
- Nunca encerrar processos por nome de imagem genérico — sempre por PID específico.
- Antes de usar qualquer SDK/pacote de terceiro citado em documentação, verificar com `npm view` (ou equivalente) que a versão real existe e não é um placeholder — a documentação pode estar à frente da publicação real.
- Um evento nunca deve ser publicado no EventBus antes de estar persistido no Event Store.
- Um erro de listener/assinante nunca deve derrubar outros assinantes nem quem publicou.
- Toda resposta de erro da API segue o envelope `{ error: { code, message, correlationId, details? } }`.
- Toda integração externa é opcional e desligada por padrão — nunca conectar automaticamente sem configuração explícita (env var, config), e o endpoint de status deve reportar "desabilitado"/erro real honestamente, nunca fingir conexão.
- Nunca encadear dois routers de modelo no mesmo caminho de requisição.
- Identidade visual do Ultron deve ser 100% original — ícone atual é placeholder neutro.

---

*Atualize este arquivo ao final de cada fase concluída ou sempre que houver uma mudança relevante de direção, para que qualquer sessão futura possa retomar o trabalho sem perda de contexto.*
