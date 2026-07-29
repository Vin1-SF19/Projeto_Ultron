# ADR-004 — Engine de Roteamento de Modelos

## Status
Aceito

## Data
2026-07-29

## Contexto
`claude-code-router` e `OmniRoute` (ambos auditados em [UPSTREAM_AUDIT.md](../research/UPSTREAM_AUDIT.md)) possuem sobreposição funcional total: ambos são gateways HTTP locais que roteiam entre múltiplos provedores de LLM com fallback. Encadear os dois no mesmo caminho de requisição criaria roteamento duplicado, fallback duplicado, contabilização inconsistente, dificuldade de auditoria, risco de loops e debugging desnecessariamente complexo (seção 6 do prompt mestre).

Achados relevantes da auditoria:
- `claude-code-router`: 36,3k stars, release quase diária (v3.0.17 em 28/07/2026), mas com issues abertas conhecidas sobre overwrite de configuração global e perda de contagem de tokens em streaming SSE (#1587).
- `OmniRoute`: 33,7k stars, release muito recente (v3.8.48) corrigindo um crash de inicialização da versão anterior (v3.8.47) — indício de processo de release menos maduro/mais instável no momento desta auditoria.

## Decisão
Criar uma interface interna `RoutingEngine` (contrato TypeScript já especificado na seção 6 do prompt mestre: `route`, `execute`, `stream`, `health`, `listProviders`, `listModels`) da qual todo o domínio do Ultron depende — nunca diretamente de um router externo.

Implementações:
1. `NativeRoutingEngine` — interface/fallback interno, sempre disponível.
2. `ClaudeCodeRouterAdapter` — **primeira integração externa**, por ser o projeto com maior maturidade relativa de release e ausência de incidente de crash recente na auditoria.
3. `OmniRouteAdapter` — integração **posterior e opcional**, com pin de versão explícito e smoke test obrigatório a cada atualização, dado o histórico de release quebrada identificado nesta auditoria.

Apenas um engine principal é configurável por vez (`native` | `claude-code-router` | `omniroute`). Um segundo engine só pode ser usado como executor explicitamente selecionado pelo usuário/config, nunca como proxy transparente encadeado sem visibilidade.

## Alternativas consideradas
- **Usar OmniRoute como router principal desde o início:** rejeitado nesta auditoria porque a v3.8.47 (release imediatamente anterior à analisada) quebrava a inicialização do pacote npm — sinal de maturidade de QA inferior no momento da decisão. Pode ser revisitado com nova auditoria futura se o histórico de estabilidade melhorar.
- **Encadear claude-code-router → OmniRoute (ou vice-versa):** rejeitado explicitamente pelo prompt mestre e por esta auditoria — sobreposição funcional total tornaria o comportamento de fallback imprevisível e não auditável.
- **Não usar nenhum router externo, implementar roteamento 100% interno desde o início:** parcialmente adotado — `NativeRoutingEngine` cobre isso como fallback, mas reimplementar todo o roteamento multi-provedor internamente desde o início duplicaria esforço já resolvido por `claude-code-router` sem necessidade comprovada.

## Consequências
- O domínio do Ultron nunca fica acoplado a um router externo específico — trocar de `claude-code-router` para `OmniRoute` (ou vice-versa) é uma troca de adapter, não uma mudança de domínio.
- Toda decisão de rota deve permanecer auditável (perfil solicitado, modelo escolhido, provider, motivo, fallback usado, latência, tokens, custo — seção 16), independentemente de qual adapter está ativo.
- Dado o bug conhecido de perda de contagem de tokens em streaming SSE no `claude-code-router` (#1587), a telemetria de custo do Ultron não deve confiar cegamente no adapter externo — validar/complementar com métricas capturadas no próprio Model Gateway sempre que possível.
- Esta decisão deve ser reavaliada com um novo ADR se a auditoria técnica futura (contínua, não pontual) concluir que a maturidade relativa dos dois projetos mudou.
