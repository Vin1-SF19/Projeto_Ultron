# STATUS DO PROJETO ULTRON

> Arquivo de continuidade. Se o contexto da conversa for perdido/resetado, leia este arquivo primeiro para saber exatamente onde o trabalho parou e o que fazer a seguir.

Última atualização: 2026-07-29 (sessão da tarde, pós-retorno do usuário)

---

## 1. O QUE É ESTE PROJETO

Superassistente pessoal/profissional local-first ("Projeto Ultron"), especificado em [prompt_Inicial.md](prompt_Inicial.md) (4313 linhas).

Resumo rápido: monólito modular local (Tauri 2 + React no desktop, Control Plane em Node + Fastify + WebSocket + SQLite), com adapters para OpenClaw, Ollama, Claude Code, Codex, routers de modelo, ElevenLabs, Gmail, Calendar, WhatsApp, GitHub. 20 fases de implementação.

Repositório remoto: https://github.com/Vin1-SF19/Projeto_Ultron.git (branches `master`/`develop` sincronizadas; `phase/NN-nome` por fase).

---

## 2. ONDE PARAMOS (ESTADO ATUAL)

**FASE 0 (Auditoria) — CONCLUÍDA.**
**FASE 1 (Fundação do monorepo) — CONCLUÍDA.**
**FASE 2 (Control Plane e Event Bus) — CONCLUÍDA.**
**FASE 3 (OpenClaw Adapter) — CONCLUÍDA e VALIDADA CONTRA GATEWAY REAL.**
**FASE 4 (Providers, modelos e router) — CONCLUÍDA e VALIDADA CONTRA OLLAMA REAL.**
**FASE 5 (Onboarding e Segredos) — PARCIALMENTE CONCLUÍDA.** Keychain (`SecretStore`) e configuração de modelos/providers (persistência + API) prontos e validados end-to-end. **Ainda faltam**: onboarding com UI navegável no desktop, seleção de pasta de projeto, sistema de permissões/níveis de autonomia (tarefas #34, #35, #36 já criadas na lista de tasks).

### Provider adicional configurado nesta sessão

O usuário forneceu credenciais de um **Ollama remoto próprio** (`https://ollama.alpha-comex.com/v1`, API compatível OpenAI, modelos 30B-35B: `qwen3-coder:30b`, `qwen3.6:35b`, `gemma4:e4b`, etc.). Configurado via `POST /api/v1/providers/config`, persistido como `provider.id = "ollama-remoto"`, segredo salvo no Windows Credential Manager (nunca no SQLite — verificado). Perfis `coding`, `deep-reasoning`, `high-quality` atualizados para preferir esse provider, com fallback para `ollama` local. **Isso é uma configuração deste ambiente específico, não um default de produto** — ver [ADR-011](docs/adr/ADR-011-user-configured-providers.md).

**Nota de continuidade:** se uma sessão futura reiniciar o Control Plane do zero (banco `~/.ultron/ultron.sqlite` recriado), o provider `ollama-remoto` **não estará mais configurado** a menos que o SQLite anterior seja preservado — o teste desta sessão sempre limpou `~/.ultron` antes/depois. Se o usuário quiser esse provider disponível permanentemente, reconfigurar via `POST /api/v1/providers/config` (token está com o usuário, não deve ser reexibido em nenhum log desta conversa).

### Checklist Fase 5 (parcial, concluído nesta sessão)
- [x] [ADR-010](docs/adr/ADR-010-secret-storage.md): `@napi-rs/keyring` escolhido sobre `keytar` (deprecated). Confirmado prebuild para `win32-x64-msvc`.
- [x] `packages/security`: `SecretStore` (set/get/delete via Windows Credential Manager, testado com mock e também validado contra o Credential Manager real) + `redactSensitiveKeys` (utilitário de redaction).
- [x] Migration `003_providers` (tabela `providers`: id, name, kind, base_url, secret_ref, enabled — nunca a credencial em si).
- [x] `packages/openai-compatible-adapter`: `OpenAiCompatibleClient` + `OpenAiCompatibleAdapter` (`ModelProviderAdapter` para qualquer endpoint `/v1` compatível OpenAI — reutilizável para OpenAI real no futuro). Testado (mock) garantindo que a API key nunca aparece em nenhum log/erro/retorno.
- [x] `ProviderConfigStore` no control-plane: `upsert`/`list`/`getApiKey`/`remove`, persistindo metadados no SQLite e credencial no keychain.
- [x] Endpoints: `POST /api/v1/providers/config`, `DELETE /api/v1/providers/config/:id` — atualizam o `Map` de adapters do `RoutingEngine` em memória imediatamente (sem reiniciar o processo), auditam sucesso/falha (`hasCredential: true/false`, nunca o valor).
- [x] Perfis `coding`/`deep-reasoning`/`high-quality` atualizados para preferir `ollama-remoto` com fallback `ollama`.
- [x] **Validado de ponta a ponta**: provider configurado via `curl` real, SQLite confirmado sem o token (checagem automatizada), keychain do Windows testado (escrita/leitura/exclusão reais), execução real via perfil `coding` retornando resposta correta do `qwen3-coder:30b` remoto, auditoria completa.
- [x] 12 testes novos (security: 6, openai-compatible-adapter: 6) + 3 novos testes de endpoint no control-plane — total 76 testes em 10 pacotes, todos passando. Lint/typecheck/build limpos.
- [ ] Onboarding com UI (tarefa #34).
- [ ] Seleção de pasta de projeto (tarefa #35).
- [ ] Sistema de permissões/autonomia (tarefa #36).

## 3. INCIDENTE EVITADO NESTA SESSÃO (importante)

Ao investigar processos `node.exe` ativos para encerrar o Control Plane de teste, encontrei **5 processos node simultâneos**. Antes de matar por PID, verifiquei o `CommandLine` de cada um via `Get-CimInstance Win32_Process` — descobri que **3 deles eram do editor Cursor do usuário** (tsserver, typingsInstaller), não relacionados a este trabalho. Matá-los por engano teria sido um incidente sério (travar o editor do usuário). **Lição reforçada: sempre inspecionar o `CommandLine` completo de um PID antes de encerrá-lo, nunca assumir que "processo node.exe" = "meu processo de teste".**

## 4. DECISÕES TOMADAS (ADRs)

ADR-001 a ADR-011 — ver [docs/adr/](docs/adr/). Destaques da Fase 5: **ADR-010** (`@napi-rs/keyring` sobre `keytar`), **ADR-011** (providers configurados em runtime, específicos deste ambiente).

## 5. ESTRUTURA DE CÓDIGO ATUAL (para orientação rápida)

```text
packages/
  security/                    NOVO na Fase 5 — SecretStore, redactSensitiveKeys
  openai-compatible-adapter/    NOVO na Fase 5 — cliente + adapter genérico /v1 OpenAI-compatible
  (demais inalterados desde Fase 4: contracts, database, event-bus, openclaw-adapter, model-gateway, ollama-adapter)

apps/control-plane/src/
  provider-config-store.ts   NOVO — persistência de providers configurados (SQLite + keychain)
  main.ts                     + SecretStore, ProviderConfigStore, recarrega providers configurados no boot
  server.ts                    + POST/DELETE /api/v1/providers/config
  routing-config.ts            perfis coding/deep-reasoning/high-quality agora preferem ollama-remoto
```

## 6. PRÓXIMOS PASSOS IMEDIATOS (ordem)

1. **Commitar a Fase 5** em commits pequenos. Merge `phase/05-onboarding-secrets` → `develop` → `master`, push.
2. Decidir com o usuário: completar o restante da Fase 5 (onboarding com UI, seleção de pasta, permissões — tarefas #34-36) antes de avançar, ou seguir direto para a Fase 6 (Home, Chat e Rosto) e voltar ao onboarding depois. Ambas as ordens são defensáveis; perguntar preferência.
3. Seguir estritamente a ordem das 20 fases quando decidido.

## 7. REGRAS DE OURO (não esquecer em nenhuma sessão futura)

- Nunca instalar componentes de sistema sem confirmação explícita, salvo janela de autonomia vigente e específica.
- **Credenciais de provider pago/serviço externo são SEMPRE bloqueantes** — mas uma vez que o usuário as forneceu voluntariamente no chat, tratar com o máximo cuidado: nunca reexibir em terminal/log, usar variável de ambiente ou arquivo temporário para repassar a ferramentas, nunca persistir fora do keychain do SO.
- Nunca inventar que um comando funcionou — sempre registrar comando, resultado, exit code, erro real.
- **Antes de encerrar qualquer processo por PID, inspecionar o `CommandLine` completo** (`Get-CimInstance Win32_Process`) — nunca assumir que todo `node.exe` é seu.
- Nunca encerrar processos por nome de imagem genérico.
- Antes de usar qualquer SDK/pacote de terceiro, verificar com `npm view` que a versão real existe e não é um placeholder.
- Um evento nunca deve ser publicado no EventBus antes de estar persistido no Event Store.
- Toda resposta de erro da API segue o envelope `{ error: { code, message, correlationId, details? } }`.
- Toda integração externa é opcional e desligada por padrão.
- Nunca encadear dois routers de modelo no mesmo caminho de requisição.
- Nunca instalar/baixar modelo local automaticamente sem confirmação.
- Nunca inventar custo de provider — quando desconhecido, `estimatedCost` fica `undefined`, nunca um número inventado.
- Identidade visual do Ultron deve ser 100% original — ícone atual é placeholder neutro.
- Providers configurados via API ficam em memória (`Map` mutável compartilhado) — persistem entre requisições mas são recarregados do zero a cada reinício do processo (lidos do SQLite + keychain no boot).

---

*Atualize este arquivo ao final de cada fase concluída ou sempre que houver uma mudança relevante de direção, para que qualquer sessão futura possa retomar o trabalho sem perda de contexto.*
