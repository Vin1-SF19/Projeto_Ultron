# ADR-001 — Monólito Modular Local

## Status
Aceito

## Data
2026-07-29

## Contexto
O Ultron precisa orquestrar dezenas de módulos internos (conversa, tarefas, agentes, projetos, router de modelos, integrações, voz, memória, aprovações, event store, auditoria) e integrar diversos serviços externos (OpenClaw, Ollama, Claude Code, Codex, routers de modelo, ElevenLabs, Gmail, Calendar, WhatsApp, GitHub). É um produto instalado localmente na máquina de um único usuário, não um serviço multi-tenant hospedado.

## Decisão
Adotar um **monólito modular local**: um único Control Plane process (Node.js/Fastify) hospedando todos os módulos internos como pacotes bem separados dentro do mesmo processo, e não uma coleção de microsserviços. Serviços externos permanecem como processos separados, consumidos via adapter (subprocesso, sidecar HTTP, ou WebSocket/RPC).

## Alternativas consideradas
- **Microsserviços com mensageria (Kafka) e orquestração (Kubernetes):** rejeitado. Não há necessidade de escala multi-tenant; a complexidade operacional (deploy, observabilidade distribuída, consistência eventual) não se paga para uma aplicação desktop de usuário único, especialmente considerando o hardware local confirmado no diagnóstico (i5-1334U, 32GB RAM, sem GPU dedicada) — rodar Kubernetes/Kafka localmente consumiria recursos desproporcionais ao valor entregue.
- **Múltiplos bancos de dados / Redis obrigatório:** rejeitado no MVP. SQLite com WAL atende aos requisitos de persistência local; Redis adicionaria um processo extra sem necessidade comprovada.
- **Service mesh:** rejeitado — não há múltiplos serviços internos que precisem de service discovery/mTLS interno; o Control Plane é um processo único.

## Consequências
- Positivas: deploy simples (poucos processos), debugging mais fácil, menor superfície de infraestrutura, adequado ao perfil "local-first" e ao hardware do usuário.
- Negativas: exige disciplina de modularização interna (pacotes bem isolados em `packages/`) para não degenerar em "big ball of mud"; caso o produto evolua para modo servidor/multi-usuário (Fase 20, funcionalidade avançada), esta decisão deverá ser revisitada com um novo ADR.
- Elementos como Kafka, Kubernetes, múltiplos bancos, Redis obrigatório, service mesh só podem ser adicionados mediante ADR específico e necessidade comprovada (não antecipação especulativa).
