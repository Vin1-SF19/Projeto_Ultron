# STATUS DO PROJETO ULTRON

> Arquivo de continuidade. Se o contexto da conversa for perdido/resetado, leia este arquivo primeiro para saber exatamente onde o trabalho parou e o que fazer a seguir.

Última atualização: 2026-07-29 (fim do dia — Fase 6 concluída)

---

## 1. O QUE É ESTE PROJETO

Superassistente pessoal/profissional local-first ("Projeto Ultron"), especificado em [prompt_Inicial.md](prompt_Inicial.md) (4313 linhas).

Resumo rápido: monólito modular local (Tauri 2 + React no desktop, Control Plane em Node + Fastify + WebSocket + SQLite), com adapters para OpenClaw, Ollama, Claude Code, Codex, routers de modelo, ElevenLabs, Gmail, Calendar, WhatsApp, GitHub. 20 fases de implementação.

Repositório remoto: https://github.com/Vin1-SF19/Projeto_Ultron.git (branches `master`/`develop` sincronizadas; `phase/NN-nome` por fase).

---

## 2. ONDE PARAMOS (ESTADO ATUAL)

**FASES 0-6 CONCLUÍDAS.** Todas validadas com testes automatizados E com o app real rodando (Control Plane + dev server/Tauri), não apenas com testes unitários.

Próxima fase: **FASE 7** (ver [prompt_Inicial.md](prompt_Inicial.md) para o escopo exato — ainda não investigado em detalhe nesta sessão).

### Resumo por fase
- **Fase 0**: auditoria de 6 projetos de referência, arquitetura, threat model, ADRs 001-004.
- **Fase 1**: monorepo, Control Plane (Fastify+WebSocket+SQLite), app Tauri mínimo.
- **Fase 2**: Event Bus, Audit Log, erros padronizados, correlation IDs, replay por cursor.
- **Fase 3**: OpenClaw Adapter, testado contra Gateway real instalado nesta sessão.
- **Fase 4**: RoutingEngine com fallback/circuit breaker, Ollama local testado com inferência real.
- **Fase 5**: keychain (`SecretStore`), configuração de providers em runtime (incl. Ollama remoto do usuário), sistema de autonomia/permissões, seleção de pasta de projeto, onboarding com UI retomável — **tudo validado rodando o app real**.
- **Fase 6**: streaming real de tokens (Ollama NDJSON + OpenAI-compatible SSE) via WebSocket, rosto SVG original com 14 estados reagindo a eventos reais, layout de Home em 3 colunas, chat funcional com Markdown/histórico/streaming, estado offline/reconexão — **validado com o dev server real + Ollama local rodando de verdade (não só mocks)**.

### Checklist Fase 6 (completa)
- [x] `packages/ollama-adapter` e `packages/openai-compatible-adapter`: `executeStream()` consumindo o protocolo nativo de streaming de cada provider (NDJSON e SSE respectivamente), em vez de simular incrementalidade.
- [x] `NativeRoutingEngine.stream()`: usa `executeStream` do adapter quando disponível; cai para token único (resposta inteira) quando o adapter não suporta — nunca finge granularidade que não existe.
- [x] Control Plane `/ws`: protocolo `model_stream_start`/`model_stream_token`/`model_stream_done`/`model_stream_error`/`model_stream_cancel`, reaproveitando o WebSocket já existente (sem SSE dedicado).
- [x] `apps/desktop/src/face/`: `Face.tsx` (SVG original, 14 estados obrigatórios da seção 24), `face-state.ts`, `event-to-face-state.ts` (mapeamento de eventos reais → estado, nunca decorativo). Respiração sutil, piscadas, `prefers-reduced-motion`, modo sem animação, opção de ocultar rosto.
- [x] `apps/desktop/src/chat/`: `ChatSocket` (cliente do protocolo `model_stream_*`), `ChatPanel.tsx` (Markdown via `react-markdown`, histórico em memória, indicador de provider/modelo, banner de desconexão).
- [x] `apps/desktop/src/home/Home.tsx`: layout de 3 colunas (navegação lateral estática + rosto/chat central + "seu dia" à direita como placeholder honesto, nunca com dados de exemplo). `ProjectsPanel` (Fase 5) reaproveitado dentro da coluna direita até existir roteamento real de navegação.
- [x] `App.tsx`: decide entre diagnóstico (desconectado) / Onboarding (não concluído) / Home (conectado + onboarding `done`).
- [x] 46 novos testes automatizados (25 no desktop + 3 de streaming no control-plane + 6 nos adapters + 3 no routing-engine + outros), todos passando; build/lint/typecheck limpos em todo o monorepo.
- [x] Validado no dev server real com Ollama local: mensagem enviada, tokens chegando incrementalmente (confirmado via WS real, não mock), rosto reagindo thinking → speaking → success, banner "Control Plane desconectado — reconectando…" aparecendo ao derrubar o Control Plane com a Home já aberta.

### O que existe hoje no ambiente (importante para continuar)
- **Ollama local** instalado, rodando, com `llama3.2:1b`.
- **Ollama remoto do usuário** configurável via `POST /api/v1/providers/config` (não fica persistido entre reinícios de banco limpo — reconfigurar quando necessário; token não deve ser reexibido em log/terminal).
- **OpenClaw CLI** instalado; Gateway pode ou não estar rodando em background — checar com `openclaw gateway status`.
- **Rust, Cargo, Visual Studio Build Tools** instalados.
- **Windows Application Control**: o usuário desativou uma política que bloqueava a execução do `.exe` de debug recém-compilado. Isso pode precisar ser revisitado para produção/distribuição real (usuário sinalizou "ver depois" — ficou registrado como pendência de UX/distribuição, não uma tarefa de fase específica ainda).

### Checklist Fase 5 (completa, incluindo o que ficou pendente antes)
- [x] `packages/security`: `SecretStore` via `@napi-rs/keyring` (ADR-010), `redactSensitiveKeys`.
- [x] `packages/openai-compatible-adapter`: adapter genérico para qualquer `/v1` compatível OpenAI.
- [x] `ProviderConfigStore`: persistência SQLite (metadados) + keychain (segredo) para providers configurados pelo usuário.
- [x] Sistema de autonomia: `packages/contracts/approval.ts` (4 níveis + regras de autonomia delimitada), migration `004_autonomy_config`, `AutonomyConfigStore`, endpoints `GET/PUT /api/v1/settings/autonomy`.
- [x] Seleção de pasta de projeto: `ProjectStore` (validação real de caminho/permissões, nunca escaneia disco às cegas), migration `005_projects`, endpoints `GET/POST/DELETE /api/v1/projects`, `@tauri-apps/plugin-dialog` integrado no desktop (`ProjectsPanel.tsx`).
- [x] Onboarding com UI: `packages/contracts/onboarding.ts`, migration `006_onboarding_progress`, `OnboardingStore` (retomável — persiste `currentStep`/`completedSteps`), endpoints `GET /api/v1/onboarding`, `POST /api/v1/onboarding/advance`, `POST /api/v1/onboarding/reset`. Componente `Onboarding.tsx` no desktop com as 9 etapas reais (welcome, diagnostics, assistant, models, openclaw, projects, integrations, security, test) — cada etapa usa dados reais do Control Plane, nenhuma simulada.
- [x] **Bug real encontrado e corrigido em produção**: CORS ausente no Control Plane impedia qualquer chamada do app empaconhado (origem `http://tauri.localhost`) além de `/health` — só descoberto ao testar o app de verdade (não pego pelos testes automatizados, que usam `app.inject()` e não simulam CORS de browser). Corrigido com `@fastify/cors` (ADR-012), 2 testes novos, validado no app real pelo usuário.
- [x] 100 testes automatizados (10 pacotes), lint/typecheck/build limpos.

## 3. LIÇÕES DE DIAGNÓSTICO DESTA SESSÃO (importantes para não repetir investigação)

1. **"Failed to fetch" no app Tauri empacotado quase sempre é CORS**, não CSP — a origem real do WebView2 em build de produção é `http://tauri.localhost` (Windows) / `tauri://localhost` (outras plataformas), diferente de `http://localhost:1420` do dev server. Testar com `curl -H "Origin: http://tauri.localhost"` para reproduzir sem precisar abrir o app.
2. `app.inject()` do Fastify **não simula CORS** — um endpoint pode passar em todos os testes automatizados e ainda assim falhar no browser real por falta de CORS. Sempre que adicionar/mudar rotas, também validar manualmente no app real quando possível.
3. Ao investigar comportamento "grudado" numa versão antiga do frontend, checar (em ordem de probabilidade real observada): (a) se o `dist/` foi rebuildado e o `.exe` recompilado *depois* dessa build (senão o Tauri empacota um `dist/` antigo), (b) CORS, (c) só por último o cache do WebView2 em `~/AppData/Local/<identifier>/EBWebView` — nesta sessão essa hipótese foi tentada e não era a causa, mas vale descartar rápido com um `rm -rf`.
4. **Antes de encerrar qualquer processo por PID, sempre confirmar via `Get-CimInstance Win32_Process | Select ProcessId, CommandLine`** — nesta sessão isso preveniu matar acidentalmente processos do editor Cursor do usuário.

## 4. DECISÕES TOMADAS (ADRs)

ADR-001 a ADR-012 — ver [docs/adr/](docs/adr/). Destaques recentes: **ADR-010** (keychain), **ADR-011** (providers configurados em runtime), **ADR-012** (CORS para origem do app desktop). Nenhum ADR novo foi necessário na Fase 6 (decisão de reaproveitar o `/ws` existente em vez de SSE dedicado foi registrada só no commit, por ser reversível e de baixo impacto arquitetural).

## 5. ESTRUTURA DE CÓDIGO ATUAL (para orientação rápida)

```text
packages/
  contracts/           + approval.ts, project.ts, onboarding.ts (Fase 5)
  security/            SecretStore, redactSensitiveKeys
  model-gateway/        model-provider.ts agora com executeStream?() opcional; native-routing-engine.ts com stream() real
  ollama-adapter/        ollama-client.ts com chatStream() (NDJSON); ollama-adapter.ts com executeStream()
  openai-compatible-adapter/  openai-compatible-client.ts com chatStream() (SSE); adapter com executeStream()
  database/             + migrations 003 (providers), 004 (autonomy_config), 005 (projects), 006 (onboarding_progress)

apps/control-plane/src/
  server.ts             + CORS (@fastify/cors), endpoints de onboarding/projects/settings/autonomy/providers/config
                         + /ws com protocolo model_stream_start/token/done/error/cancel (Fase 6)
  provider-config-store.ts, autonomy-config-store.ts, project-store.ts, onboarding-store.ts  (Fase 5)
  main.ts               instancia todos os stores acima, recarrega providers configurados no boot

apps/desktop/src/
  face/                  NOVO (Fase 6) — Face.tsx (SVG, 14 estados), face-state.ts, event-to-face-state.ts
  chat/                  NOVO (Fase 6) — ChatSocket (cliente do /ws), ChatPanel.tsx (Markdown/streaming)
  home/                  NOVO (Fase 6) — Home.tsx (layout 3 colunas: nav + rosto/chat + "seu dia")
  Onboarding.tsx         wizard de 9 etapas, retomável (Fase 5)
  ProjectsPanel.tsx      seletor nativo de pasta (Tauri dialog) + lista de projetos (Fase 5), agora dentro da Home
  App.tsx                decide entre diagnóstico / Onboarding / Home com base no estado real
  control-plane-client.ts  cliente HTTP tipado (REST); streaming vive em chat/chat-socket.ts (WS)
```

## 6. PRÓXIMOS PASSOS IMEDIATOS (ordem)

1. **Merge da Fase 6**: branch `phase/06-home-chat-face` → `develop` → `master`, push (ainda não feito nesta sessão — só commits locais).
2. Ler a seção correspondente à **Fase 7** em [prompt_Inicial.md](prompt_Inicial.md) e planejar as tarefas antes de começar a codar.
3. Pendência de UX/distribuição ainda não resolvida (ver seção 2 abaixo): bloqueio do Windows Application Control sobre o `.exe` não assinado — usuário sinalizou "ver depois", possivelmente relevante na Fase 18 (empacotamento/assinatura de código).
4. Continuar validando cada entrega visual rodando o app real (dev server ou Tauri) — testes automatizados sozinhos não garantem que o app funciona de verdade (lição reconfirmada nesta fase: o comportamento de streaming e o banner de desconexão só foram validados com confiança total ao rodar o Control Plane e o Ollama de verdade, não só com mocks).

## 7. REGRAS DE OURO (não esquecer em nenhuma sessão futura)

- Nunca instalar componentes de sistema sem confirmação explícita, salvo janela de autonomia vigente e específica.
- **Credenciais de provider pago/serviço externo são SEMPRE bloqueantes** — tratar com máximo cuidado quando fornecidas (nunca reexibir em terminal/log).
- Nunca inventar que um comando funcionou — sempre registrar comando, resultado, exit code, erro real.
- **Antes de encerrar qualquer processo por PID, inspecionar o `CommandLine` completo** — nunca assumir que todo `node.exe`/processo é seu.
- Antes de usar qualquer SDK/pacote de terceiro, verificar com `npm view` que a versão real existe e não é um placeholder.
- Um evento nunca deve ser publicado no EventBus antes de estar persistido no Event Store.
- Toda resposta de erro da API segue o envelope `{ error: { code, message, correlationId, details? } }`.
- Toda integração externa é opcional e desligada por padrão.
- Nunca encadear dois routers de modelo no mesmo caminho de requisição.
- Nunca instalar/baixar modelo local automaticamente sem confirmação.
- Nunca inventar custo de provider — quando desconhecido, `estimatedCost` fica `undefined`.
- Identidade visual do Ultron deve ser 100% original — ícone atual é placeholder neutro.
- **App Tauri empacotado roda sob origem `http://tauri.localhost`/`tauri://localhost` — todo novo endpoint do Control Plane precisa estar coberto pela lista de CORS em `ALLOWED_ORIGINS` (server.ts) e, se usar método novo (além de GET/POST/PUT/DELETE), declarar em `methods` no registro do plugin CORS.**
- Testes automatizados com `app.inject()` não substituem validação manual no app real para bugs de CORS/rede/browser.

---

*Atualize este arquivo ao final de cada fase concluída ou sempre que houver uma mudança relevante de direção, para que qualquer sessão futura possa retomar o trabalho sem perda de contexto.*
