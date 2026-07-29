# Arquitetura Inicial — Visão Geral

Data: 2026-07-29
Status: proposta inicial (Fase 0), sujeita a ADRs específicos por decisão.

## Princípio arquitetural

Monólito modular local, não coleção de microserviços (ver [ADR-001](../adr/ADR-001-modular-monolith.md)).

```text
Ultron Desktop (Tauri 2 + React + TS)
    |
    | WebSocket interno (/ws) + REST (/api/v1)
    v
Ultron Control Plane (Node.js + Fastify + WebSocket + SQLite)
    |
    +-- Conversation Engine
    +-- Personal Assistant Engine
    +-- Task Queue (persistente, SQLite)
    +-- Agent Orchestrator
    +-- Project Engine
    +-- Model Gateway (RoutingEngine)
    +-- Integration Hub
    +-- Voice Engine
    +-- Memory Engine
    +-- Approval Engine
    +-- Event Store / Event Bus
    +-- Audit Engine
    |
    | processos externos (subprocesso / sidecar HTTP / WebSocket-RPC)
    v
Serviços e ferramentas externas
    +-- OpenClaw Gateway        (WebSocket/RPC, opcional)
    +-- Ollama                  (HTTP local)
    +-- Claude Code CLI         (subprocesso)
    +-- Codex CLI               (subprocesso)
    +-- claude-code-router      (sidecar HTTP, 1a opção de router externo)
    +-- OmniRoute               (sidecar HTTP, 2a opção, posterior)
    +-- ElevenLabs              (API remota)
    +-- Gmail / Calendar        (API remota, OAuth)
    +-- WhatsApp                (via OpenClaw plugin)
    +-- GitHub                  (API remota)
```

## Camada anticorrupção

Nenhum serviço externo expõe seu formato de dados diretamente à interface. Todo evento externo passa por um adapter dedicado que o traduz para `DomainEvent` antes de entrar no Event Store:

```text
Serviço externo (ex: OpenClaw Gateway Event)
    -> Adapter (ex: OpenClawAdapter)
    -> Ultron Domain Event
    -> Event Store
    -> Event Bus / WebSocket interno
    -> Interface (React)
```

Isso vale para todos os adapters: `OpenClawAdapter`, `ClaudeCodeRouterAdapter`, `OmniRouteAdapter`, `OllamaAdapter`, `ElevenLabsSttAdapter`/`TtsAdapter`, `GmailAdapter`, `CalendarAdapter`, `WhatsappAdapter` (via OpenClaw), `GithubAdapter`.

## Por que não microsserviços agora

Ver seção 4 do [prompt_Inicial.md](../../prompt_Inicial.md): evitar Kafka, Kubernetes, múltiplos bancos, Redis obrigatório, filas externas, service mesh — tudo isso só entra mediante ADR e necessidade comprovada. A auditoria (seção build-vs-reuse) confirma que todos os 6 projetos de referência já resolvem seus próprios domínios como processos HTTP/subprocesso independentes — não há necessidade de orquestração de containers para o MVP local-first rodando na máquina de um único usuário.

## Decisão de router de modelos

Conforme seção 6 do prompt mestre e confirmado pela auditoria: `claude-code-router` e `OmniRoute` têm sobreposição funcional. Nunca encadear os dois no mesmo caminho de requisição. A `RoutingEngine` interna do Ultron é a única interface que o resto do domínio conhece; `ClaudeCodeRouterAdapter` é a primeira implementação externa (`NativeRoutingEngine` continua sendo a interface/fallback interno). `OmniRouteAdapter` é opcional e posterior — ver [ADR-004](../adr/ADR-004-model-routing.md).

## Runtime do Control Plane: Node vs Bun

Ambiente local já possui Node v24.16.0 confirmado e funcional. Bun também está disponível (v1.3.14). Decisão registrada em [ADR-002](../adr/ADR-002-runtime-control-plane.md).

## Persistência

SQLite com WAL habilitado, foreign keys habilitadas, busy timeout configurado. Migrations versionadas. Nenhuma credencial em texto plano — apenas `secret_ref` apontando para o keychain nativo do SO (Windows Credential Manager na plataforma prioritária). Ver [ADR-005](../adr/ADR-005-database.md) (a criar em fase subsequente da auditoria).

## Prioridade de plataforma

Windows 11 é a plataforma de desenvolvimento e prioridade inicial (confirmado: Windows 11 Pro build 26200, sem WSL2 instalado, sem GPU dedicada — Iris Xe integrada, 32GB RAM). Arquitetura deve permanecer pronta para Linux/macOS, mas nenhuma feature deve depender de WSL2 estar presente — ele é opcional e detectado, nunca instalado silenciosamente (seção 44 do prompt mestre).
