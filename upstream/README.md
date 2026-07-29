# upstream/

Este diretório documenta — mas não vendoriza código-fonte — os projetos externos usados como referência ou dependência de serviço pelo Ultron.

Ver auditoria completa em [docs/research/UPSTREAM_AUDIT.md](../docs/research/UPSTREAM_AUDIT.md).

| Projeto | Papel | Integração |
|---|---|---|
| [openclaw/openclaw](https://github.com/openclaw/openclaw) | Gateway multi-canal (WhatsApp etc.), opcional | `packages/openclaw-adapter` (WebSocket/RPC) |
| [open-jarvis/OpenJarvis](https://github.com/open-jarvis/OpenJarvis) | Referência arquitetural (local-first + Tauri) | Não integrado em runtime |
| [musistudio/claude-code-router](https://github.com/musistudio/claude-code-router) | Router de modelos (1ª opção) | `packages/claude-code-router-adapter` (sidecar HTTP) |
| [SynkraAI/aiox-core](https://github.com/SynkraAI/aiox-core) | Tooling de desenvolvimento do time | npm/npx, fora do runtime |
| [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc) | Integração pontual dev-workflow | Subprocesso `codex` CLI |
| [diegosouzapw/OmniRoute](https://github.com/diegosouzapw/OmniRoute) | Router de modelos (2ª opção, posterior) | `packages/omniroute-adapter` (sidecar HTTP) |

Nenhum destes projetos é copiado/vendorizado para dentro deste repositório — todos são consumidos como processos externos via adapter, conforme decidido em [ADR-001](../docs/adr/ADR-001-modular-monolith.md) e [ADR-003](../docs/adr/ADR-003-openclaw-integration.md).
