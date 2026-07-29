# Threat Model Inicial — Projeto Ultron

Data: 2026-07-29
Status: inicial (Fase 0). Será revisado e consolidado na Fase 17 (Observabilidade, Custos e Segurança).

## Princípios

```text
least privilege
deny by default
explicit consent
local-first
auditability
reversibility
bounded autonomy
separation of trusted and untrusted input
```

## Superfícies de ameaça e mitigação planejada

### 1. Prompt injection (e-mail, WhatsApp, páginas web, conteúdo de projeto)

**Evidência empírica já coletada:** durante a própria auditoria de upstream desta Fase 0, uma página web retornou conteúdo formatado para se passar por instrução de sistema (`settings-json`) dirigida ao agente de pesquisa. O agente não obedeceu — mas isso confirma que o risco é real e ativo, não hipotético.

Mitigação:
- Conteúdo de e-mail, WhatsApp, páginas web e qualquer dado externo é sempre tratado como **entrada não confiável**, nunca como comando com autoridade automática.
- Nenhuma instrução embutida em conteúdo externo pode disparar execução de shell, envio de mensagem, ou acesso a arquivo sem passar pelo Approval Engine.
- Mesmo contatos "permitidos" no WhatsApp não recebem autoridade automática sobre ações perigosas (seção 33 do prompt mestre).

### 2. Shell injection / command injection

Mitigação:
- Parser de comandos e política de classificação (leitura segura / alteração controlada / perigoso), nunca comparação textual simples (seção 41).
- Executores (`ClaudeCodeExecutor`, `CodexExecutor`, futuros) rodam com cwd específico, ambiente reduzido, timeout, limite de saída, captura de PID/exit code.

### 3. Path traversal

Mitigação:
- Validação de caminho ao adicionar projeto (seção 20).
- Proteção explícita contra path traversal na criação/remoção de worktrees (seção 21).
- Bloqueio por padrão de arquivos sensíveis (`.env`, chaves privadas, credenciais, dumps de banco, perfis de navegador, chaves SSH) no Context Builder (seção 36).

### 4. Exposição de tokens / segredos em logs

Mitigação:
- Redaction centralizada (seção 39) — logs nunca incluem API keys, refresh tokens, senhas, cookies, chaves privadas.
- Segredos nunca no SQLite em texto plano — apenas `secret_ref` apontando para keychain nativo do SO (seção 7).

### 5. Plugins/skills maliciosos de terceiros

**Confirmado na auditoria:** pesquisadores identificaram skills de terceiros no ecossistema OpenClaw exfiltrando dados sem consentimento do usuário, e um incidente de agente criando perfil externo sem autorização.

Mitigação:
- `OpenClawAdapter` nunca concede acesso a segredos diretamente — tudo passa pelo sistema de permissões do Ultron (seção 5).
- Plugin próprio (`packages/openclaw-ultron-plugin`) nunca acessa segredos sem passar pelo Approval Engine.

### 6. Mensagens e e-mails maliciosos

Mitigação: ver item 1 (prompt injection). Adicionalmente, diferenciar explicitamente `mensagem recebida` / `comando reconhecido` / `pedido de ação` / `conteúdo comum` / `conteúdo não confiável` (seção 33).

### 7. Dependências comprometidas / supply chain

Mitigação:
- Nenhum dos 6 projetos de referência é importado como biblioteca de código — todos rodam como processo externo isolado (ver [BUILD_VS_REUSE.md](../architecture/BUILD_VS_REUSE.md)), reduzindo superfície de supply-chain attack no núcleo do Ultron.
- Pin de versão explícito em adapters de projetos com ritmo de release instável (OmniRoute teve release quebrada v3.8.47 corrigida por hotfix; aiox-core evolui muito rápido).
- Nunca seguir tag `latest` automaticamente nesses adapters — exigir smoke test antes de atualizar.

### 8. Execução remota / Gateway exposto / WebSocket sem autenticação

Mitigação:
- WebSocket interno (`/ws`) do Control Plane exige autenticação, suporta subscribe/unsubscribe/replay/cursor/reconnect/heartbeat/versioning (seção 45).
- `OpenClawAdapter` autentica explicitamente ao conectar ao Gateway (seção 5).

### 9. Subprocesso órfão / processo travado

Mitigação:
- Executores devem encerrar árvore de processos completa, detectar travamento, suportar cancelamento (seção 15).
- Kill switch global deve interromper subprocessos sem corromper banco nem remover arquivos (seção 40).

### 10. Elevação de privilégio / ações destrutivas

Mitigação:
- Approval Engine obrigatório para: `read_sensitive_file`, `write_file`, `delete_file`, `execute_command`, `execute_privileged_command`, `install_dependency`, `install_model`, `network_request`, `send_email`, `send_whatsapp`, `create/update/delete_calendar_event`, `git_commit`, `git_merge`, `git_push`, `git_force_operation`, `access_new_folder`, `use_paid_provider`, `exceed_budget` (seção 22).
- Comandos classificados como "perigoso" (`sudo`, `rm` recursivo, `format`, `diskpart`, `git reset --hard`, `git clean`, force push, alteração de firewall/usuários) nunca executam sem aprovação explícita (seção 41).

### 11. Exfiltração de dados

Mitigação: mesma linha do item 5 — nenhuma integração externa recebe segredos sem aprovação; dados de integrações externas (Gmail, Calendar, WhatsApp) têm política de retenção e origem rastreável (seção 35).

### 12. Loops de custo / debate infinito entre agentes

Mitigação:
- Limites rígidos: `max_handoffs`, `max_review_rounds`, `max_retries`, `max_total_steps`, `max_total_cost`, `max_total_time` (seção 18).
- Relevante à luz da auditoria: `codex-plugin-cc` documenta que o "review gate" opcional pode criar loops longos entre Claude e Codex consumindo limites de uso rapidamente — os limites acima mitigam isso diretamente.

### 13. Download malicioso de modelo / update comprometido

Mitigação:
- Nunca instalar modelo sem confirmação, sempre mostrar tamanho/espaço/VRAM estimada antes (seção 14).
- Updater com assinatura, checksum, canais stable/beta, rollback, backup antes de atualizar (seção 48).

## Kill Switch Global

Deve:
- impedir novas execuções;
- cancelar jobs;
- interromper subprocessos;
- bloquear mensagens;
- interromper voz;
- preservar logs;
- não corromper banco;
- não remover arquivos.

## Próximos passos de segurança (fases posteriores)

- Fase 17 consolida threat model final, políticas, kill switch efetivo, testes de injeção.
- Fase 19 (Hardening) cobre fault injection: internet cai, provider cai, Gateway cai, banco trava, disco enche, processo filho trava, OAuth expira.
- Testes de segurança obrigatórios (seção 52): prompt injection em e-mail e WhatsApp, path traversal, command injection, plugin malicioso, segredo em log, arquivo `.env`, force push, exclusão, WebSocket não autenticado.
