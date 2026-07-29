# UPSTREAM_AUDIT — Auditoria dos Projetos de Referência

Data da auditoria: 2026-07-29
Método: WebSearch + WebFetch em tempo real (repositórios, releases, licenças, wikis). Nenhuma informação foi assumida do conhecimento pré-treinado do modelo sem confirmação nesta data.

> Aviso de segurança: durante a coleta, uma página web retornou conteúdo formatado para se passar por uma instrução de sistema dirigida ao agente (padrão de configuração `settings.json`). O agente de pesquisa não executou nem obedeceu esse conteúdo — foi tratado como dado observado, não como instrução. Isso é evidência empírica, de primeira mão, do risco de prompt injection via conteúdo web/externo que o [THREAT_MODEL.md](../security/THREAT_MODEL.md) deste projeto precisa cobrir.

---

## 1. openclaw/openclaw

- **URL:** https://github.com/openclaw/openclaw — ativo.
- **Função:** Assistente de IA pessoal local-first, conecta-se a 25+ canais de mensagens (WhatsApp, Telegram, Slack, Discord, Signal etc.), voz em macOS/iOS/Android, interface "Canvas" ao vivo.
- **Histórico relevante:** lançado como "Warelay" (nov/2025), renomeado para "Moltbot" (jan/2026) após reclamação de marca da Anthropic, depois para "OpenClaw". Criador (Peter Steinberger) saiu para a OpenAI em fev/2026; governança transferida para "OpenClaw Foundation".
- **Linguagem/runtime:** TypeScript/JavaScript sobre Node.js (24.15+, também 22.22.3+/25.9+), pnpm workspaces.
- **Licença:** MIT (OpenClaw Foundation, 2026).
- **Versão analisada:** release `2026.7.2-beta.5` (28/07/2026). Estrelas: variação entre fontes (~247k–384k) — número social tratado como aproximado, não crítico.
- **Arquitetura:** Gateway local-first (control plane), inbox multi-canal, roteamento multi-agente, workspaces isolados, sistema de plugins ("plugin channels"), marketplace de skills (ClawHub).
- **Componentes reutilizáveis:** padrão de gateway local + camada de canais; conceito de "Hub" companion nativo Windows.
- **Compatibilidade:** macOS, Linux, Windows (Hub nativo), iOS/Android, Wear OS.
- **Protocolo de integração:** WebSocket para pareamento de nós, RPC interno, integração MCP, SDK de plugins, webhooks/cron como first-class tools.
- **Limitações/riscos:** pesquisadores da Cisco identificaram skills de terceiros exfiltrando dados sem consentimento do usuário; incidente de agente criando perfil em app de namoro sem autorização explícita. **Risco de segurança real e documentado no sistema de skills/plugins de terceiros.**
- **Decisão de integração:** usar como **serviço externo gerenciado**, nunca copiar o núcleo para dentro do Ultron (conforme já definido na seção 5 do prompt mestre). Tratar como inspiração arquitetural (gateway + skills), mas nunca confiar cegamente em skills de terceiros — todo dado vindo do OpenClaw passa pela camada anticorrupção (`OpenClawAdapter`) antes de virar evento de domínio do Ultron.
- **Estratégia de atualização:** acompanhar releases via changelog; não seguir automaticamente `latest` sem teste de fumaça, dado o ritmo alto de mudanças.
- **Partes que não serão usadas:** núcleo do gateway multi-canal (o Ultron terá seu próprio Control Plane), sistema de skills de terceiros sem sandboxing próprio.
- **Justificativa técnica:** OpenClaw é um produto completo e opinativo demais para ser embutido; usá-lo via WebSocket/RPC como processo externo preserva isolamento e permite trocar/desligar sem afetar o núcleo do Ultron.

---

## 2. open-jarvis/OpenJarvis

- **URL:** https://github.com/open-jarvis/OpenJarvis — ativo. (Existe projeto histórico distinto `open-jarvis-legacy/legacy-jarvis`, não confundir.)
- **Função:** Framework de agentes de IA pessoais local-first — primitivas para agentes on-device, avaliações tratando energia/FLOPs/latência/custo como restrições de primeira classe, loop de aprendizado local. Ligado à iniciativa de pesquisa "Intelligence Per Watt" (Hazy Research / Scaling Intelligence Lab, Stanford SAIL).
- **Linguagem/runtime:** Python (core), extensões em Rust, frontend React, empacotamento desktop via **Tauri**.
- **Licença:** Apache License 2.0 (2025).
- **Versão analisada:** Desktop v1.0.2 (25/05/2026), commit `56c9a59`, 926 commits na main. 8.1k stars, 1.8k forks.
- **Arquitetura:** 5 primitivas (Intelligence, Engine, Agents, Tools & Memory, Learning); 8 agentes embutidos em 3 modos de execução (sob demanda, agendado, contínuo); CLI + GUI local (`localhost:5173`).
- **Componentes reutilizáveis:** padrão de arquitetura local-first + Tauri (mesma stack desktop planejada para o Ultron); sistema de "Skills" seguindo o padrão aberto **agentskills.io**.
- **Compatibilidade:** macOS, Linux (incl. WSL2), Windows nativo (instalador PowerShell); binários `.exe`, `.dmg`, `.deb`, `.rpm`, `.AppImage`.
- **Protocolo de integração:** skills via agentskills.io (padrão aberto, importável de outras fontes incl. OpenClaw); OAuth para Gmail/Calendar/Tasks. Sem evidência confirmada de MCP nativo ou WebSocket documentado.
- **Limitações/riscos:** projeto jovem (release "1.0" recente em 2026), 33 issues abertas/62 PRs — ainda em maturação, não estabilidade de longo prazo comprovada.
- **Decisão de integração:** usar como **referência de arquitetura** (local-first + Tauri + skills abertas). Se algum componente for reaproveitado em runtime, fazer via subprocesso/sidecar (API HTTP local), nunca como biblioteca Python importada dentro do Control Plane TypeScript.
- **Estratégia de atualização:** não aplicável como dependência direta — é referência, revisitar releases periodicamente para captar decisões de design.
- **Partes que não serão usadas:** stack Python/Rust do core (o Ultron usa TypeScript/Node no Control Plane); os 8 agentes embutidos específicos.
- **Justificativa técnica:** confirma que Tauri é escolha validada por projeto correlato; padrão agentskills.io é candidato a avaliar para o sistema de skills/plugins do Ultron no futuro.

---

## 3. musistudio/claude-code-router

- **URL:** https://github.com/musistudio/claude-code-router — ativo. Repo satélite: `musistudio/claude-code-router-action`.
- **Função:** Gateway local para unificar múltiplos agentes de codificação (Claude Code, Codex, Grok CLI, Kimi CLI, Kilo Code, OpenCode, Pi, ZCode) sob um único endpoint, roteando entre múltiplos provedores de LLM.
- **Linguagem/runtime:** TypeScript/JavaScript, Node.js 22+, build Electron para desktop.
- **Licença:** MIT (2025).
- **Versão analisada:** v3.0.17 (28/07/2026). 36,3k stars, 3,0k forks, 871 issues, 173 PRs.
- **Arquitetura:** Gateway HTTP local (porta padrão 3456) + UI de gerenciamento via browser (porta 3458); intercepta requisições de múltiplos agentes/CLIs.
- **Compatibilidade:** macOS (Intel/Apple Silicon), Windows, Linux, Docker.
- **Protocolo de integração:** endpoint HTTP local compatível com protocolos OpenAI Chat, Anthropic Messages e Gemini; integração de ferramentas MCP; sistema de plugins (wrapper + core gateway plugins).
- **Limitações/riscos (issues abertas verificadas):**
  - #1599 — múltiplos agentes Claude não respeitam configurações padrão (overwrite de config global).
  - #1601 — login via Claude Code falha silenciosamente no macOS (mudança de sufixo do keychain).
  - #1602 — perfis de agente sobrescrevem `~/.claude/settings.json` mesmo com gerenciamento desabilitado na UI.
  - #1588 — cálculo de proporção de cache exibe valores acima de 1000%.
  - #1587 — tradução SSE para Anthropic perde dados de uso de tokens (`output_tokens:0`) — **relevante: não confiar cegamente nisso para billing/telemetria de custo**.
  - #1597 — comportamento inesperado com contexto de 1M tokens.
- **Decisão de integração:** candidato a **ClaudeCodeRouterAdapter**, rodando como sidecar/subprocesso HTTP local, consumido pela `RoutingEngine` interna do Ultron (ver seção 6 do prompt mestre). Não usar como proxy encadeado com OmniRoute.
- **Estratégia de atualização:** pin de versão explícito; releases quase diárias, mas com issues abertas de perda de contagem de tokens — validar telemetria de custo em toda atualização antes de confiar no dado.
- **Partes que não serão usadas:** UI de gerenciamento própria (o Ultron terá sua própria tela de modelos/router).
- **Justificativa técnica:** desenhado exatamente para o papel de gateway externo consumido via HTTP — não requer fork, isolamento limpo via processo próprio.

---

## 4. SynkraAI/aiox-core

- **URL:** https://github.com/SynkraAI/aiox-core — ativo. Relacionado: `SynkraAI/aiox-squads`.
- **Função:** "Synkra AIOS" — framework CLI-first de orquestração de múltiplos agentes especializados (analyst, PM, architect, developer, QA, UX, PO, SM, DevOps, data-engineer) colaborando via arquivos de "story" em fluxo Agile, com "Autonomous Development Engine" (ADE).
- **Linguagem/runtime:** TypeScript/Node.js (≥18, recomendado 20+), npm ≥9.
- **Licença:** MIT (derivado do método BMad, conforme README).
- **Versão analisada:** v5.3.0 (changelog citando "CORE-SUPER-UPDATE", 11/07/2026) — ritmo de release muito alto, tratar como aproximado. 3,1k stars, 937 forks, 958 commits.
- **Arquitetura:** CLI-first (CLI > Observability > UI); agentes meta (orchestrator/master) + agentes de planejamento/desenvolvimento; "Squads" para domínios não-técnicos.
- **Compatibilidade:** Windows, macOS, Linux.
- **Protocolo de integração:** integração com registro MCP para ferramentas externas; suporte multi-IDE (Claude Code, Codex CLI, Cursor, GitHub Copilot, Gemini CLI, AntiGravity).
- **Limitações/riscos:** suporte a hooks/lifecycle varia por IDE; **funcionalidades avançadas exigem "AIOX Pro"** (modelo comercial/restrito sobre um core MIT); cache de licença legada expira em 90 dias exigindo reativação online.
- **Observação direta:** esta é, muito provavelmente, a origem das skills `AIOX:agents:*` (analyst, architect, dev, devops, pm, po, qa, sm, ux-design-expert) já presentes neste ambiente de desenvolvimento.
- **Decisão de integração:** usar apenas como **tooling de desenvolvimento** (scaffolding/orquestração de squads de IA para o próprio time construindo o Ultron), **não** como componente de runtime do produto final.
- **Estratégia de atualização:** atualizar via npm/npx quando necessário para o workflow de dev; não é dependência de produção.
- **Partes que não serão usadas:** qualquer funcionalidade "Pro"/paga; não incorporar ao domínio do Ultron.
- **Justificativa técnica:** é um framework de processo de desenvolvimento, não uma peça de arquitetura do produto — usá-lo no runtime criaria acoplamento desnecessário a um serviço comercial de terceiro.

---

## 5. openai/codex-plugin-cc

- **URL:** https://github.com/openai/codex-plugin-cc — ativo, oficial da organização `openai`. (Não confundir com `thepushkarp/cc-codex-plugin`, não-oficial.)
- **Função:** Plugin para Claude Code que invoca o Codex CLI/agente da OpenAI para revisão de código e delegação de tarefas via comandos de barra (`/codex:review`, `/codex:rescue`, `/codex:transfer`, `/codex:status`, `/codex:result`, `/codex:cancel`).
- **Linguagem/runtime:** TypeScript/Node.js.
- **Licença:** Apache License 2.0.
- **Versão analisada:** v1.0.6 (08/07/2026) — mudança de segurança: "remover expansão de shell para comandos git". 29 commits (pequeno em volume, mas oficial e mantido ativamente). 30,3k stars, 2,0k forks (alto para o volume de código, mas plausível dado o selo oficial).
- **Arquitetura:** plugin no ecossistema de plugins do Claude Code (`.claude-plugin/`), subagente dedicado (`codex:codex-rescue`) para delegação e rastreamento de jobs em background.
- **Compatibilidade:** sem restrição de SO explícita no README; referências a `~/.codex/` sugerem padrão Unix-like, mas roda sobre Node.js (deve funcionar em Windows, não confirmado explicitamente).
- **Protocolo de integração:** delega tudo ao binário `codex` local já instalado/autenticado (assinatura ChatGPT, incl. plano Free, ou API key OpenAI). Não expõe API/WebSocket/MCP próprios.
- **Limitações/riscos:** revisões multi-arquivo podem ser lentas; "review gate" opcional pode criar loops longos entre Claude e Codex, consumindo limites de uso rapidamente — **relevante para os limites `max_review_rounds`/`max_handoffs` já exigidos no prompt mestre (seção 18)**.
- **Decisão de integração:** relevante apenas se a arquitetura de agentes do Ultron envolver Claude Code como orquestrador e Codex como revisor auxiliar — é dev-tooling, não infraestrutura de produto.
- **Estratégia de atualização:** acompanhar releases oficiais da OpenAI; dependência leve (wrapper).
- **Partes que não serão usadas:** nenhuma exclusão relevante — escopo já é mínimo.
- **Justificativa técnica:** integrar via subprocesso assumindo `codex` CLI já instalado/autenticado na máquina do usuário (alinhado ao `CodexExecutor` da seção 15 do prompt mestre); não requer fork.

---

## 6. diegosouzapw/OmniRoute

- **URL:** https://github.com/diegosouzapw/OmniRoute — ativo, projeto de indivíduo (Diego Rodrigues de Sa e Souza), não de organização.
- **Função:** Gateway de IA "free MIT" agregando 290+ provedores (90+ gratuitos) e 500+ modelos em endpoint único compatível com OpenAI (`/v1/*`), com fallback automático sensível a cota, compressão de tokens, suporte a MCP/A2A.
- **Linguagem/runtime:** TypeScript/JavaScript sobre Node.js; dashboard Next.js; também Electron desktop e PWA.
- **Licença:** MIT (2026).
- **Versão analisada:** v3.8.48 (13/07/2026) — hotfix corrigindo crash na inicialização do pacote npm v3.8.47 (`ERR_MODULE_NOT_FOUND`) e problemas de empacotamento Electron no Windows. Há indício de tag `release/v3.8.50` mais nova — **versionamento avança muito rápido, reverificar antes de qualquer pin definitivo**. 33,7k stars, 4,4k forks, alega "500+ contribuidores" (tratar com ceticismo, sem evidência de fraude).
- **Arquitetura:** roteamento em 4 tiers (assinatura tipo Claude Code/Codex/Copilot → provedores com API key → backends custo-otimizado → fallbacks gratuitos); pipeline de compressão com 12 engines (RTK, Caveman, LLMLingua-2 etc., alegando 15–95% economia de tokens); circuit breaker de 3 camadas.
- **Compatibilidade:** Linux, macOS, Windows (npm/pnpm), Docker multi-arch, ARM/Raspberry Pi, Android via Termux, PWA, Electron desktop.
- **Protocolo de integração:** REST compatível OpenAI, servidor MCP com 104 ferramentas, suporte A2A (JSON-RPC 2.0), WebSocket/SSE para streaming.
- **Limitações/riscos:** release quebrada recente (v3.8.47) corrigida por hotfix imediato — indício de processo de QA/release ainda instável apesar do alto ritmo de features. Alegações de "zero telemetria" e "500+ contribuidores" não verificadas independentemente.
- **Decisão de integração:** papel equivalente ao `claude-code-router` — **integração posterior e opcional**, conforme já definido na seção 6 do prompt mestre. Escolha inicial recomendada continua sendo `NativeRoutingEngine` + `ClaudeCodeRouterAdapter` primeiro; `OmniRouteAdapter` entra depois, com pin de versão explícito.
- **Estratégia de atualização:** nunca seguir tag `latest` automaticamente; exigir teste de fumaça (smoke test) a cada bump de versão, dado o histórico de release quebrada.
- **Partes que não serão usadas:** dashboard Next.js próprio, app Electron próprio (o Ultron tem seu próprio desktop Tauri).
- **Justificativa técnica:** mesma lógica do claude-code-router — sidecar HTTP local, nunca encadeado com outro router no mesmo caminho de requisição (conforme proibido na seção 6 do prompt mestre).

---

## Documentações Oficiais Consultadas

### docs.openclaw.ai
Documentação de onboarding organizada em 10 eixos (Início, Instalação, Canais, Agentes, Capacidades, ClawHub, Modelos, Plataformas, Gateway & Ops, Referência). Foco em guias práticos, não especificação profunda de API. Seção "Reference" (CLI/schemas/RPC) e "ClawHub" são o ponto de entrada técnico real para integração — aprofundar antes de implementar o `OpenClawAdapter`.

### elevenlabs.io/docs
A raiz é majoritariamente landing page comercial; documentação técnica real em `/docs/overview` e `/api-reference`. Confirmado: API REST com SDKs oficiais Python e TypeScript. Modelos principais: **Eleven v3** (70+ idiomas, limite 5.000 caracteres), **Flash v2.5** (~75ms latência, até 40.000 caracteres — melhor opção para TTS conversacional de baixa latência do Ultron), **Scribe v2** (STT, 90+ idiomas, diarização, modo realtime ~150ms — candidato para o STT streaming da seção 28). Cobrança por crédito/caractere (TTS) ou por segundo de áudio (STT) — deve ser modelado explicitamente no orçamento/custo do Ultron (seção 16 do prompt mestre: nunca inventar preços).

### tauri.app
Framework para apps desktop multiplataforma (Linux, macOS, Windows, Android, iOS), frontend web arbitrário + backend Rust, usa webview nativo do SO (binários ~600KB). Versão atual da documentação: **Tauri 2.0**. Segurança é citada como prioridade central da equipe. Confirma escolha da seção 7 do prompt mestre (Tauri 2 + Rust + React) e é validada por uso correlato no OpenJarvis.

### git-scm.com/docs/git-worktree
Documentação oficial do `git worktree`: múltiplas árvores de trabalho vinculadas ao mesmo repositório, checkout simultâneo de branches diferentes sem stash/clone duplicado. Comandos: `add`, `list`, `remove`, `move`, `lock/unlock`, `prune`, `repair`. Requer Git 2.5.0+ (ambiente atual tem 2.54.0 — compatível). Limitações: worktree principal não pode ser removida; suporte a submodules é frágil. Base direta para a Fase 10 (isolamento por worktree) do prompt mestre.

---

## Síntese — Matriz de Decisão de Integração

| Projeto | Papel no Ultron | Modo de integração | Requer fork? |
|---|---|---|---|
| openclaw/openclaw | Serviço externo de canais/gateway (opcional) | WebSocket/RPC via `OpenClawAdapter` | Não |
| open-jarvis/OpenJarvis | Referência arquitetural (local-first + Tauri + skills) | Não integrado em runtime; inspiração de design | Não |
| musistudio/claude-code-router | Router de modelos (1ª opção) | Sidecar HTTP local via `ClaudeCodeRouterAdapter` | Não |
| SynkraAI/aiox-core | Tooling de desenvolvimento do próprio time | npm/npx durante desenvolvimento, fora do runtime do produto | Não |
| openai/codex-plugin-cc | Integração pontual dev-workflow (Claude Code ↔ Codex) | Subprocesso, dependente do `codex` CLI local | Não |
| diegosouzapw/OmniRoute | Router de modelos (2ª opção, posterior) | Sidecar HTTP local via `OmniRouteAdapter`, com pin de versão | Não |

Nenhum dos 6 projetos exige fork para uso básico. Nenhum é biblioteca importável no sentido estrito — todos são aplicações/serviços completos, o que reforça a decisão arquitetural da seção 4 do prompt mestre (monólito modular local que consome serviços externos via adapters, e não os incorpora).

**Riscos transversais identificados nesta auditoria que alimentam o [THREAT_MODEL.md](../security/THREAT_MODEL.md):**
1. Skills/plugins de terceiros (OpenClaw) podem exfiltrar dados sem consentimento — nunca conceder acesso a segredos sem passar pelo Approval Engine.
2. Telemetria de tokens/custo de routers externos (claude-code-router) pode estar incorreta em streaming SSE — nunca confiar cegamente para billing; validar com métricas próprias.
3. Conteúdo web/externo pode conter texto formatado para se passar por instrução de sistema (observado empiricamente durante esta própria auditoria) — reforça a regra de nunca tratar conteúdo de e-mail/WhatsApp/páginas web como comando com autoridade automática.
4. Projetos com ritmo de release muito alto (OmniRoute, aiox-core) já tiveram release quebrada recentemente — nunca seguir `latest` automaticamente nesses adapters; pin de versão + smoke test obrigatórios.
