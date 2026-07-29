# Roadmap — Projeto Ultron

Baseado nas 20 fases definidas em [prompt_Inicial.md](../../prompt_Inicial.md), seção 51.

| Fase | Nome | Status |
|---|---|---|
| 0 | Auditoria, pesquisa e arquitetura | **Concluída** |
| 1 | Fundação do monorepo | **Concluída** |
| 2 | Control Plane e Event Bus | **Concluída** |
| 3 | OpenClaw Adapter | **Concluída** |
| 4 | Providers, modelos e router | **Concluída** (OpenAI/Claude/Codex pendentes de credencial do usuário) |
| 5 | Onboarding e segredos | **Concluída** — validada com o app real (onboarding, seleção de pasta, autonomia, keychain, providers) |
| 6 | Home, chat e rosto | **Em andamento** |
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
6. SDK oficial do OpenClaw (`@openclaw/gateway-client`/`gateway-protocol`) só existe funcional na tag `beta` — a tag `latest` do npm é um placeholder vazio. Nunca atualizar automaticamente sem `npm view` confirmando que a nova versão tem código real (ver ADR-007).
7. Escopos de operador do OpenClaw por padrão não incluem `operator.read` — qualquer onboarding do Ultron que gere token do OpenClaw precisa configurar escopos explicitamente, nunca aceitar o default silenciosamente (ver ADR-008).
8. Providers pagos (OpenAI, Anthropic API, Codex) não foram implementados na Fase 4 por exigirem credenciais do usuário — decisão sempre bloqueante (seção 56 do prompt mestre), mesmo sob janela de autonomia ampla. A interface `ModelProviderAdapter` já está pronta para receber esses adapters assim que o usuário fornecer as credenciais (Fase 5).
9. Builds empacotados do Tauri (`tauri build`, diferente de `tauri dev`) rodam sob a origem `http://tauri.localhost`/`tauri://localhost`, estritamente cross-origin em relação ao Control Plane — qualquer novo endpoint precisa estar coberto pelo CORS configurado (ADR-012). `app.inject()` do Fastify não pega esse tipo de bug — validação manual no app real continua necessária.
10. O WebView2 do Tauri mantém um perfil de cache persistente em `~/AppData/Local/<identifier>/EBWebView` entre execuções — em caso de comportamento "preso" numa versão antiga do frontend que não bate com o `.exe`/`dist` atual, considerar limpar esse diretório como parte do diagnóstico (não foi a causa do bug de CORS desta sessão, mas é uma variável real a descartar).
