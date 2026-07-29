# ADR-008 — Fluxo de onboarding/autenticação do OpenClaw observado empiricamente

## Status
Aceito

## Data
2026-07-29

## Contexto
[ADR-007](ADR-007-openclaw-sdk.md) registrou uma lacuna: a documentação pública do OpenClaw não descreve o fluxo exato de pairing/autenticação inicial de um cliente novo. Nesta sessão, testamos o fluxo real, com aprovação do usuário para instalar o OpenClaw CLI (`npm install -g openclaw@latest`) e rodar onboarding não-interativo, permitindo observar o comportamento real.

## Observações empíricas
1. **Instalação:** `npm install -g openclaw@latest --allow-scripts openclaw` funciona no Windows sem problemas (pacote `openclaw`, não os SDKs `beta`). CLI versão `2026.7.1-2` instalada com sucesso.
2. **Onboarding não-interativo mínimo funcional:**
   ```
   openclaw onboard --non-interactive --accept-risk --auth-choice skip \
     --gateway-auth token --no-install-daemon --skip-channels --skip-skills \
     --skip-hooks --skip-search --skip-ui --json
   ```
   Gera `~/.openclaw/openclaw.json` com `gateway.auth.mode: "token"` e um token de 48 caracteres gerado automaticamente (formato hex), sem exigir nenhuma interação humana. Cria também `~/.openclaw/workspace` (com um repositório git próprio!) e `~/.openclaw/agents/main/sessions`.
3. **Sem `--install-daemon`, o onboarding NÃO sobe o Gateway** — ele apenas valida se um Gateway já está rodendo (`phase: "gateway-health"`, falha com `ECONNREFUSED` se não estiver). É preciso rodar `openclaw gateway run` separadamente.
4. **`openclaw gateway run` é um processo de longa duração** (não retorna) que deve ser mantido vivo como processo de background — leva ~15-20s para ficar pronto na primeira execução (compilação/carregamento de plugins).
5. **Lock de migração:** rodar `gateway run` e matá-lo abruptamente (ex: timeout do lado do cliente) deixa um lock de "startup migrations already running" no estado interno (provavelmente no `~/.openclaw/state/openclaw.sqlite`), que só libera após um timeout informado na própria mensagem de erro (alguns minutos). Não existe (ou não encontramos) comando de CLI para limpar esse lock manualmente — a única opção observada foi aguardar.
6. **Escopo padrão do token é restrito:** o token gerado por `--gateway-auth token` sem configuração adicional de scopes **não inclui `operator.read`** por padrão. Uma chamada RPC `status` autenticada com esse token retorna erro estruturado `"missing scope: operator.read"` — comportamento correto de least-privilege, não um bug. Para o `OpenClawAdapter` operar com mais funcionalidade (ex: listar agentes/sessões), será necessário configurar escopos explicitamente durante o onboarding (flag não explorada nesta sessão) ou via configuração pós-onboarding.
7. **Evento `integration.openclaw.health` chega automaticamente**, sem necessidade de request explícito — o Gateway emite esse evento periodicamente (visto no teste real, com métricas reais de event loop, plugins carregados, etc.). Evento `integration.openclaw.tick` também observado (heartbeat).
8. **Recomendação nativa do próprio CLI**: ao rodar no Windows nativo, o `openclaw onboard` imprime um aviso recomendando WSL2 ("Windows detected - OpenClaw runs great on WSL2! Native Windows might be trickier."). Isso não impediu o funcionamento nesta sessão (rodou nativamente sem problemas), mas é um sinal de que o suporte a Windows nativo é secundário no roadmap do próprio OpenClaw.

## Decisão
1. O onboarding do Ultron (Fase 5, ainda não implementada) deve, para a opção "Conectar Gateway existente / Instalar localmente" (seção 43 do prompt mestre, Etapa 5), replicar o padrão de onboarding não-interativo observado aqui, mas com escopos de operador explícitos configurados (não deixar no default restrito).
2. O `OpenClawAdapter` deve tratar o erro `missing scope: <nome>` como uma categoria reconhecível (não apenas erro genérico), permitindo à interface do Ultron explicar ao usuário exatamente qual permissão falta — alinhado à seção 22 do prompt mestre (mostrar risco/detalhe de cada aprovação).
3. Se o Ultron algum dia precisar orquestrar o próprio start/stop do processo `openclaw gateway run` (em vez de esperar que o usuário/serviço já o mantenha rodando), deve tratar timeouts de inicialização com folga generosa (30s+ observados) e nunca matar o processo abruptamente sem um `stop`/`SIGTERM` gracioso, dado o comportamento de lock observado no item 5.

## Consequências
- Confirma que a arquitetura de "serviço externo gerenciado" (ADR-003) é a correta — o Gateway é um processo de longa duração com seu próprio ciclo de vida, estado (SQLite próprio), e locks internos, que o Ultron não deve tentar controlar diretamente além de start/stop via processo.
- O onboarding do Ultron precisará decidir explicitamente sobre escopos de operador (não usar o default), o que deve ser uma escolha visível ao usuário, não uma decisão silenciosa do agente.
- Ambiente de teste local desta sessão: token gerado ficou temporariamente visível em output de terminal durante a investigação — tratado como comprometido; recomendado ao usuário regenerá-lo (`openclaw onboard --reset-scope config` ou edição manual de `~/.openclaw/openclaw.json`) antes de expor esse Gateway a qualquer uso real.
