# ADR-009 — Ollama como primeiro provider real de modelos

## Status
Aceito

## Data
2026-07-29

## Contexto
A Fase 4 exige ao menos um provider de modelos funcional para validar a `RoutingEngine`/`NativeRoutingEngine` de ponta a ponta. Providers pagos (OpenAI, Anthropic API direta) exigem credenciais do usuário — uma categoria que a seção 56 do prompt mestre marca como sempre bloqueante, mesmo dentro de uma janela de autonomia ampla. Ollama, por outro lado, não exige nenhuma credencial e já era o primeiro runtime local planejado (seção 14 do prompt mestre).

Ollama não estava instalado no ambiente (confirmado no diagnóstico da Fase 0). Foi instalado nesta sessão via `winget install --id Ollama.Ollama` (pacote oficial, hash verificado), seguido de `ollama pull llama3.2:1b` — um modelo pequeno (1.3GB, 1.2B parâmetros) escolhido deliberadamente pelo hardware confirmado na Fase 0 (sem GPU dedicada, apenas Iris Xe integrada).

## Decisão
Usar Ollama como primeiro `ModelProviderAdapter` real, implementado em `packages/ollama-adapter`, consumindo a API HTTP local do Ollama (`http://127.0.0.1:11434`, endpoints `/api/tags` e `/api/chat`) diretamente via `fetch`, sem SDK de terceiros (a API do Ollama é simples o suficiente para não justificar uma dependência adicional).

## Alternativas consideradas
- **Usar um SDK Node oficial/comunitário do Ollama:** não avaliado a fundo — a API HTTP é pequena e estável o suficiente (2 endpoints usados) para não precisar de abstração extra; reavaliar se a superfície de uso crescer significativamente (embeddings, streaming token-a-token, etc.).
- **Adiar a Fase 4 até que o usuário forneça credenciais de um provider pago:** rejeitado — bloquearia toda a fase por uma dependência evitável; Ollama permite validar toda a arquitetura de roteamento/fallback/circuit breaker sem nenhuma credencial.

## Consequências
- `estimatedCost` do Ollama é sempre `{ currency: 'BRL', amount: 0 }` — declarado explicitamente, nunca omitido, seguindo a regra de nunca inventar preço mas também nunca esconder que o custo é zero (seção 16 do prompt mestre).
- Perfis de roteamento padrão (`chat-fast`, `chat-balanced`, `coding`, `private-local`, `offline`) apontam para `ollama` como único preferredProvider por ora — quando providers pagos forem configurados (Fase 5, com credenciais do usuário), os perfis deverão ser atualizados para refletir as preferências corretas (ex: `coding` preferindo Claude/Codex quando disponível).
- Validado end-to-end nesta sessão: `GET /api/v1/providers`, `/models`, `/providers/health`, e `POST /api/v1/models/execute` todos testados contra o Ollama real, com inferência real (`llama3.2:1b` respondendo corretamente a perguntas), latência real registrada (~2.7s em CPU), e auditoria registrando sucesso/falha.
