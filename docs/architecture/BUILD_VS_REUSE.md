# Matriz Build vs Reuse

Data: 2026-07-29
Baseado em: [UPSTREAM_AUDIT.md](../research/UPSTREAM_AUDIT.md)

Critério de decisão: constrói-se internamente (`build`) tudo que é núcleo de domínio, estado, segurança e experiência do Ultron. Reutiliza-se (`reuse`) como serviço externo tudo que já existe maduro o suficiente e cujo acoplamento pode ser mantido fraco via adapter/HTTP/subprocesso.

| Componente | Decisão | Como | Justificativa |
|---|---|---|---|
| Control Plane (Fastify + WebSocket + Event Store) | **Build** | Interno, TypeScript/Node | Núcleo de domínio; nenhum projeto de referência oferece isso pronto no formato que o Ultron precisa |
| Desktop shell | **Build** | Tauri 2 + React | Validado por OpenJarvis; leve, cross-platform, seguro |
| Rosto/avatar animado | **Build** | SVG animado ou Rive (a avaliar licença) | Identidade original é requisito de produto (seção 2) |
| Event Bus / Domain Events | **Build** | Interno | Contrato de evento específico do domínio Ultron (seção 11) |
| Task Queue persistente | **Build** | SQLite + lógica própria | Requisitos muito específicos (leases, dead-letter, recursos nomeados) — nenhum projeto de referência cobre isso |
| Agent Orchestrator + manifests | **Build** | Interno | Modelo de agente/handoff é específico do domínio |
| Model Gateway / RoutingEngine (interface) | **Build** | Interface interna `RoutingEngine` | Necessário para desacoplar de qualquer router externo |
| Execução de roteamento de modelos | **Reuse** (1ª fase) | `claude-code-router` como sidecar HTTP via `ClaudeCodeRouterAdapter` | Maduro, ativo, endpoint HTTP pronto, não requer fork |
| Execução de roteamento de modelos (2ª opção) | **Reuse** (posterior) | `OmniRoute` via `OmniRouteAdapter`, com pin de versão | Alternativa; histórico recente de release quebrada exige cautela |
| Canais de mensageria (WhatsApp) | **Reuse** | OpenClaw (plugin WhatsApp) via `OpenClawAdapter` | Não vale a pena reimplementar Baileys/protocolo WhatsApp do zero |
| Modelos locais | **Reuse** | Ollama via adapter próprio | Padrão de facto, maduro, documentado |
| Voz (STT/TTS) | **Reuse** | ElevenLabs (Flash v2.5 + Scribe v2) via adapters dedicados | API madura, baixa latência confirmada na auditoria |
| Execução Claude Code / Codex | **Reuse** | `ClaudeCodeExecutor` / `CodexExecutor` chamando os CLIs oficiais como subprocesso | Autenticação oficial já resolvida pelos próprios CLIs |
| Revisão cruzada Claude↔Codex | **Reuse (opcional, dev-workflow)** | `codex-plugin-cc` como referência de padrão de handoff | Já oficial da OpenAI; não é infraestrutura de produto, mas informa o design de handoff |
| Isolamento de mudanças de código | **Build sobre ferramenta padrão** | `git worktree` (nativo do Git) orquestrado por lógica própria | Documentação oficial confirma suporte maduro (Git 2.5+) |
| Gerenciamento de segredos | **Build sobre APIs nativas do SO** | Windows Credential Manager / macOS Keychain / Linux Secret Service | Requisito de segurança não-negociável (seção 7) |
| Tooling de desenvolvimento do time (scaffolding de agentes) | **Reuse, fora do runtime** | `aiox-core` via npm/npx durante desenvolvimento | Já presente no ambiente como skills; não deve virar dependência de produção |
| Memória (FTS + metadados) | **Build** | SQLite FTS5 | Controle total sobre origem, retenção, exclusão exigido pela seção 35 |
| Observabilidade | **Build** (local) | OpenTelemetry opcional, Pino | Telemetria externa desligada por padrão (seção 39) |

## Princípio geral

Nenhum serviço externo entra "dentro" do processo do Control Plane. Todos os reuses acima se conectam via processo separado (subprocesso, sidecar HTTP, ou API remota), nunca como dependência de código importada que rode no mesmo processo com os mesmos privilégios do núcleo do Ultron. Isso preserva a possibilidade de killswitch, isolamento de falhas, e auditoria de cada fronteira (ver seção 5 e 40 do prompt mestre).
