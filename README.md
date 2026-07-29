# Projeto Ultron

Superassistente pessoal e profissional **local-first**, instalado na máquina do usuário: conversa por texto e voz, rosto animado original, memória, orquestração de agentes de IA, gerenciamento de projetos/tarefas, e integrações opcionais (Gmail, Google Calendar, WhatsApp, GitHub, ElevenLabs, Ollama e outros).

> Nome interno de desenvolvimento: "Ultron". A identidade visual, personagem, voz e personalidade finais serão **100% originais** — nenhum elemento protegido de personagens de terceiros é ou será utilizado.

## Documentação

- Especificação completa do produto: [prompt_Inicial.md](prompt_Inicial.md)
- Estado atual e continuidade entre sessões: [STATUS.md](STATUS.md)
- Arquitetura: [docs/architecture/OVERVIEW.md](docs/architecture/OVERVIEW.md)
- Auditoria de projetos de referência: [docs/research/UPSTREAM_AUDIT.md](docs/research/UPSTREAM_AUDIT.md)
- Decisões arquiteturais (ADRs): [docs/adr/](docs/adr/)
- Threat model: [docs/security/THREAT_MODEL.md](docs/security/THREAT_MODEL.md)
- Roadmap de fases: [docs/product/ROADMAP.md](docs/product/ROADMAP.md)

## Estrutura do monorepo

```text
apps/
  desktop/         # Tauri 2 + React + TypeScript (shell desktop)
  control-plane/   # Node.js + Fastify + WebSocket + SQLite (núcleo operacional)
packages/          # Módulos internos e adapters de integração
upstream/          # Notas sobre projetos externos referenciados
docs/              # Documentação (arquitetura, ADRs, segurança, runbooks...)
scripts/           # Scripts de setup, desenvolvimento, empacotamento, diagnóstico
tests/             # Testes de integração, e2e, segurança, performance
```

## Desenvolvimento

Pré-requisitos: Node.js ≥22, pnpm ≥9.

```bash
pnpm install
pnpm dev
```

Outros comandos:

```bash
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

## Princípios

- Local-first: funciona sem depender de serviços externos; toda integração externa é opcional.
- Nenhuma ação perigosa é executada sem aprovação explícita do usuário.
- Nenhum segredo é armazenado em texto plano — apenas referências ao keychain nativo do sistema operacional.
- Erros nunca são ocultados ou transformados em mensagens genéricas.
- Nenhum dado simulado é apresentado como real em produção.

Ver [prompt_Inicial.md](prompt_Inicial.md) para a especificação completa das regras de desenvolvimento.
