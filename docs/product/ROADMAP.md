# Roadmap — Projeto Ultron

Baseado nas 20 fases definidas em [prompt_Inicial.md](../../prompt_Inicial.md), seção 51.

| Fase | Nome | Status |
|---|---|---|
| 0 | Auditoria, pesquisa e arquitetura | **Em andamento** |
| 1 | Fundação do monorepo | Não iniciada |
| 2 | Control Plane e Event Bus | Não iniciada |
| 3 | OpenClaw Adapter | Não iniciada |
| 4 | Providers, modelos e router | Não iniciada |
| 5 | Onboarding e segredos | Não iniciada |
| 6 | Home, chat e rosto | Não iniciada |
| 7 | Voz | Não iniciada |
| 8 | Fila persistente | Não iniciada |
| 9 | Project Engine | Não iniciada |
| 10 | Worktrees e execução segura | Não iniciada |
| 11 | Agentes e orquestração | Não iniciada |
| 12 | Fluxo visual e fila | Não iniciada |
| 13 | Central pessoal | Não iniciada |
| 14 | Gmail e Calendar | Não iniciada |
| 15 | WhatsApp | Não iniciada |
| 16 | Memória | Não iniciada |
| 17 | Observabilidade, custos e segurança | Não iniciada |
| 18 | Empacotamento e release | Não iniciada |
| 19 | Hardening | Não iniciada |
| 20 | Funcionalidades avançadas | Não iniciada |

Ver [STATUS.md](../../STATUS.md) na raiz do projeto para o estado detalhado e os próximos passos imediatos — esse é o arquivo de continuidade entre sessões.

## Riscos registrados na Fase 0

1. Ambiente sem GPU dedicada (Iris Xe integrada, ~1GB VRAM reportado) — modelos locais via Ollama devem mirar perfis pequenos/quantizados (3B–8B) para desempenho aceitável em CPU/RAM; perfis `local-fast`/`local-coding` precisam de defaults realistas para este hardware.
2. WSL2 não instalado — não instalar automaticamente; qualquer feature que dependa de WSL2 deve degradar graciosamente e explicar ao usuário antes de sugerir instalação.
3. Skills de terceiros no ecossistema OpenClaw têm histórico documentado de exfiltração de dados — a integração via `OpenClawAdapter` nunca deve conceder acesso a segredos sem passar pelo Approval Engine.
4. Routers externos (claude-code-router, OmniRoute) têm bugs conhecidos de contagem de tokens em streaming — não confiar neles como fonte única de verdade para custo; validar com métricas internas.
5. Projetos de referência com ritmo de release muito alto (OmniRoute, aiox-core) já tiveram releases quebradas — nunca seguir `latest` automaticamente nos adapters correspondentes.
