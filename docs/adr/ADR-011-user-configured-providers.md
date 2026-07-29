# ADR-011 — Providers configurados pelo usuário em runtime (via API, persistidos no keychain)

## Status
Aceito

## Data
2026-07-29

## Contexto
O usuário forneceu credenciais de um Ollama remoto próprio (`https://ollama.alpha-comex.com/v1`, protocolo compatível com OpenAI, confirmado por teste real: `/v1/models` e `/v1/chat/completions` funcionais, modelos de 30B-35B parâmetros) e pediu que a conexão fique "na configuração do sistema" — ou seja, não hardcoded, gerenciável como parte da configuração persistente do Ultron.

## Decisão
1. Criar `packages/security` com `SecretStore` (ADR-010) e `packages/openai-compatible-adapter` (`ModelProviderAdapter` genérico para qualquer endpoint `/v1` compatível com OpenAI).
2. Criar `ProviderConfigStore` no Control Plane: metadados do provider (nome, tipo, `baseUrl`) no SQLite (tabela `providers`, migration `003_providers`), segredo real apenas no keychain do SO via `SecretStore` (nunca em texto plano — critério de aceite da Fase 5).
3. Expor `POST /api/v1/providers/config` e `DELETE /api/v1/providers/config/:id` para o usuário configurar/remover providers em runtime, sem reiniciar o Control Plane — o `Map` de adapters do `NativeRoutingEngine` é compartilhado por referência e atualizado imediatamente.
4. No boot, o Control Plane recarrega os providers já configurados anteriormente (lidos do SQLite, credencial buscada do keychain) e recria os adapters correspondentes.
5. Perfis de roteamento (`coding`, `deep-reasoning`, `high-quality`) foram atualizados para preferir o provider `ollama-remoto` (id derivado do nome "Ollama Remoto" fornecido pelo usuário) com fallback para `ollama` local — uma decisão específica deste ambiente, documentada aqui para não ser confundida com um default genérico do produto.

## Alternativas consideradas
- **Hardcoded no `.env`/código:** rejeitado explicitamente pelo usuário ("que fique na configuração do sistema").
- **Reconstruir toda a `RoutingEngine` a cada mudança de configuração:** rejeitado — desnecessário, já que o `Map<string, ModelProviderAdapter>` é passado por referência ao `NativeRoutingEngine`; mutar o mesmo `Map` (via `.set()`/`.delete()`) já propaga a mudança sem custo de reconstrução.
- **Guardar a API key no SQLite:** rejeitado — violaria diretamente a seção 7 do prompt mestre e o critério de aceite "nenhum segredo no banco" da Fase 5.

## Consequências
- Validado de ponta a ponta nesta sessão: provider configurado via `curl` real contra o Control Plane real, SQLite confirmado sem o token (verificação automatizada: `JSON.stringify(row)` não contém a substring do token), keychain do Windows confirmado funcionando (`SecretStore` testado com escrita/leitura/exclusão reais antes da integração), e execução real via perfil `coding` retornando resposta correta do modelo `qwen3-coder:30b` remoto.
- O `id` do provider é derivado do `name` fornecido pelo usuário (slug simples) — isso significa que o nome escolhido no onboarding vira parte da identidade técnica do provider; a Fase 5 completa (onboarding com UI, ainda pendente) deve deixar isso explícito para o usuário ou usar um ID gerado separadamente do nome de exibição.
- O provider remoto específico do usuário (`ollama-remoto`) não deve ser tratado como um default de produto — é uma configuração de ambiente. Instalações novas do Ultron não terão esse provider a menos que o próprio usuário o configure via onboarding.
