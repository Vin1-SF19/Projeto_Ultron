# ADR-002 — Runtime do Control Plane

## Status
Aceito

## Data
2026-07-29

## Contexto
O prompt mestre exige validar, antes de escolher Node ou Bun por preferência: empacotamento, suporte a subprocessos, suporte a PTY, estabilidade, bibliotecas necessárias, distribuição em Windows, execução como sidecar do Tauri, consumo de memória, compatibilidade com OpenClaw.

Diagnóstico do ambiente local (2026-07-29, Windows 11 Pro build 26200):
- Node.js v24.16.0 — instalado, funcional, confirmado via `node --version`.
- Bun v1.3.14 — também instalado e funcional, confirmado via `bun --version`.
- OpenClaw (auditoria de upstream) roda sobre Node.js 24.15+/22.22.3+/25.9+ — ou seja, o ecossistema de referência mais próximo (OpenClaw) já opera sobre Node, não Bun.
- `claude-code-router` exige Node.js 22+.
- `aiox-core` exige Node ≥18 (recomendado 20+).

## Decisão
Usar **Node.js** como runtime do Control Plane no MVP, não Bun.

## Alternativas consideradas
- **Bun:** oferece startup mais rápido e bundler embutido, mas:
  - todos os projetos de referência auditados (OpenClaw, claude-code-router, aiox-core, codex-plugin-cc) declaram Node.js como runtime alvo — usar Bun no Control Plane criaria uma camada extra de verificação de compatibilidade ao invocar/consumir esses processos externos.
  - o ecossistema de bibliotecas para PTY, subprocessos e integrações nativas do Windows é mais maduro e testado em Node.
  - a diferença de performance de startup é irrelevante para um Control Plane de longa duração (processo residente, não uma CLI invocada repetidamente).
- **Node.js:** escolhido. Suporte consolidado a subprocessos (`child_process`), compatibilidade direta com todos os adapters de serviços externos já auditados, maior maturidade de empacotamento para sidecar do Tauri no Windows.

## Consequências
- Bun permanece disponível no ambiente e pode ser usado pontualmente em scripts de desenvolvimento (ex: `bunx` para scaffolding rápido) sem se tornar o runtime do Control Plane.
- Caso surjam gargalos de performance específicos que o Node não resolva, revisitar com um novo ADR e benchmark comparativo real (não especulativo).
- Esta decisão deve ser validada na prática durante a Fase 1 (fundação do monorepo), ao rodar `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm lint` — se algum desses comandos revelar incompatibilidade não prevista, este ADR será atualizado.
