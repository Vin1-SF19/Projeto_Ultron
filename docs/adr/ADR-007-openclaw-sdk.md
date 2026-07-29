# ADR-007 — Usar o SDK oficial `@openclaw/gateway-client` em vez de protocolo próprio

## Status
Aceito

## Data
2026-07-29

## Contexto
[ADR-003](ADR-003-openclaw-integration.md) já decidiu integrar o OpenClaw como serviço externo gerenciado via `OpenClawAdapter`, comunicando por WebSocket/RPC. Antes de implementar a Fase 3, era preciso decidir: reimplementar o protocolo do zero (a partir da especificação em `docs.openclaw.ai/gateway/protocol`) ou usar um SDK oficial, se existir e for confiável.

Pesquisa realizada nesta data:
- A documentação oficial (`docs.openclaw.ai/gateway/clients`) referencia os pacotes `@openclaw/gateway-client` e `@openclaw/gateway-protocol`.
- **Verificação direta no registro npm** (não apenas a doc) via `npm view`: a tag `latest` de ambos os pacotes é `0.0.0`, descrita literalmente como *"Reserved package name for the OpenClaw Gateway client"* — um placeholder vazio (384 bytes, zero dependências, sem código funcional). **A tag `latest` não deve ser usada.**
- A tag `beta` (`2026.7.2-beta.5`, publicada via GitHub Actions há 1 dia) é o pacote real: `@openclaw/gateway-client` tem 135KB desempacotado, 3 dependências reais (`ws@8.21.1`, `ipaddr.js@2.4.0`, `@openclaw/gateway-protocol@2026.7.2-beta.5`); `@openclaw/gateway-protocol` tem 4.2MB desempacotados incluindo um `protocol.schema.json` de 1.9MB.
- Baixei e inspecionei os tarballs reais (`npm pack`) e li o `README.md` publicado dentro do pacote `@openclaw/gateway-client` — não apenas a página de marketing do site. Confirma: `GatewayClient` (entrada Node, usa `ws` como transporte), `@openclaw/gateway-client/browser` (entrada browser-safe, sem builtins do Node), protocolo wire versão 4 (`minProtocol`/`maxProtocol: 4`), handshake por challenge (`connect.challenge` → `connect` request com nonce → `hello-ok`), API `client.request(method, params)`, callback `onEvent`, reconexão automática com backoff exponencial (1s–30s, multiplicador 2), timeouts configuráveis.
- Porta padrão do Gateway: `18789` (loopback por padrão). Config em `~/.openclaw/openclaw.json`, sobrescrita por `OPENCLAW_GATEWAY_PORT`.
- Autenticação: modos `none`/`token`/`password`/`trusted-proxy`; token via `OPENCLAW_GATEWAY_TOKEN` ou config. Fluxo exato de pairing inicial (primeira vez que um cliente novo se conecta) **não está documentado publicamente** — lacuna confirmada, não presumida.
- MCP: o Gateway não expõe um servidor MCP nativo na própria porta WebSocket. Em vez disso, `openclaw mcp serve` roda como processo stdio separado que internamente fala o protocolo WebSocket com o Gateway — ou seja, MCP é uma alternativa de integração via subprocesso do CLI `openclaw`, não um substituto do protocolo RPC para quem já está fazendo um adapter dedicado.

## Decisão
Usar os pacotes oficiais **`@openclaw/gateway-client`** e **`@openclaw/gateway-protocol`**, fixados na tag `beta` com **versão exata pinada** (`2026.7.2-beta.5`, nunca `^` ou `latest`/`beta` como range), como dependência do `packages/openclaw-adapter`.

## Alternativas consideradas
- **Reimplementar o protocolo do zero a partir da especificação:** rejeitado. O SDK oficial já resolve challenge-auth, correlação de request, timeouts, reconexão com backoff, e device-token — reimplementar duplicaria esforço não trivial (o pacote de protocolo sozinho tem um schema de 1.9MB) sem necessidade comprovada, contrariando o princípio de "build vs reuse" já estabelecido na Fase 0.
- **Usar a tag `latest` (0.0.0) do npm:** rejeitado — é um placeholder vazio sem código funcional, confirmado por inspeção direta do pacote.
- **Consumir via `openclaw mcp serve` (bridge MCP por stdio) em vez de WebSocket direto:** rejeitado como estratégia principal — exigiria o binário `openclaw` CLI instalado localmente apenas para atuar como bridge, adicionando uma camada de processo e tradução desnecessária quando o SDK WebSocket nativo já está disponível para Node. Pode ser reavaliado no futuro se o produto precisar consumir tools MCP específicas do OpenClaw por outro motivo.

## Consequências
- `packages/openclaw-adapter` depende de um pacote **pre-release (`beta`)**, mantido pelos próprios autores do OpenClaw mas fora do ciclo de estabilidade `latest`. Isso é uma exceção consciente à regra geral de "nunca seguir `latest` automaticamente" do [THREAT_MODEL.md](../security/THREAT_MODEL.md) — aqui a situação é invertida: `latest` está vazio, e a única opção funcional é uma pre-release pinada explicitamente.
- Toda atualização de versão deste pacote deve ser manual, verificada por `npm view` antes de aplicar (confirmar que a nova tag realmente contém código, não regrediu para um placeholder), e acompanhada de smoke test do `OpenClawAdapter`.
- O fluxo de pairing/autenticação inicial de um cliente novo precisará ser descoberto empiricamente ao testar contra um Gateway OpenClaw real rodando localmente (fora do escopo desta pesquisa documental) — registrar o comportamento observado como atualização deste ADR ou um novo ADR quando isso acontecer.
- Toda mensagem/evento recebido do Gateway continua passando pela camada anticorrupção definida no ADR-003 antes de virar `DomainEvent` interno — o SDK oficial resolve o transporte e o protocolo wire, não substitui a fronteira de tradução para o domínio do Ultron.
