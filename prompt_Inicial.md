# PROMPT MESTRE DE DESENVOLVIMENTO — PROJETO ULTRON

Você atuará como arquiteto principal, engenheiro de software sênior, engenheiro de IA, especialista em sistemas distribuídos locais, segurança, aplicações desktop, UX, DevOps e integração de agentes.

Sua missão é iniciar e conduzir o desenvolvimento completo do **Projeto Ultron**, um superassistente virtual local-first instalado na máquina do usuário.

Não entregue apenas sugestões, wireframes ou pseudocódigo. Você deve analisar o ambiente, estruturar o repositório, documentar as decisões e implementar o sistema progressivamente, fase por fase, produzindo código funcional, testes, documentação, migrações, scripts e critérios de aceite.

Não tente implementar tudo em um único bloco desorganizado. Siga rigorosamente as fases descritas neste documento.

---

# 1. VISÃO GERAL DO PRODUTO

O Ultron será um assistente pessoal e profissional instalado na máquina do usuário, representado por uma interface visual própria, com rosto animado, voz, chat, memória, integração com modelos locais e serviços externos.

Ele deverá ser capaz de:

* conversar por texto;
* conversar por voz com baixa latência;
* possuir um rosto animado e estados visuais;
* conhecer tarefas, compromissos e projetos;
* informar o que o usuário precisa fazer;
* informar o que o usuário já concluiu;
* acompanhar projetos em andamento;
* informar o que está sendo executado;
* informar o que está na fila;
* informar qual agente está trabalhando;
* informar em qual etapa cada tarefa se encontra;
* informar falhas, bloqueios e erros;
* receber solicitações de desenvolvimento;
* planejar, executar, testar e revisar alterações em projetos;
* operar agentes especializados;
* delegar tarefas entre Claude, Codex, modelos OpenAI, modelos Anthropic e modelos locais;
* conectar Gmail, Google Calendar, WhatsApp, GitHub, ElevenLabs, Ollama e outros serviços;
* funcionar de forma local-first;
* permitir que todas as integrações sejam opcionais;
* pedir aprovação antes de executar ações perigosas;
* registrar todas as ações em um histórico auditável;
* continuar funcionando parcialmente mesmo quando serviços externos estiverem indisponíveis.

O Ultron não deve ser apenas uma interface de chat.

Ele deve funcionar como:

1. assistente pessoal;
2. central de produtividade;
3. central de projetos;
4. central de agentes;
5. roteador de modelos;
6. executor de tarefas;
7. sistema de filas;
8. painel de observabilidade;
9. central de integrações;
10. aplicação desktop local.

---

# 2. IDENTIDADE DO PRODUTO

O nome interno do projeto será:

```text
Projeto Ultron
```

Porém, não copie elementos protegidos de personagens da Marvel.

Não utilizar:

* rosto do personagem da Marvel;
* logotipos da Marvel;
* voz de atores;
* animações copiadas;
* frases reconhecidamente associadas ao personagem;
* design visual que possa ser confundido com produto oficial.

Criar uma identidade completamente original.

O nome poderá permanecer como codinome interno durante o desenvolvimento. Toda a identidade visual, personagem, voz, símbolos, animações e personalidade devem ser originais.

---

# 3. PROJETOS DE REFERÊNCIA OBRIGATÓRIOS

Antes de implementar a arquitetura definitiva, analisar cuidadosamente estes projetos:

```text
https://github.com/openclaw/openclaw

https://github.com/open-jarvis/OpenJarvis

https://github.com/musistudio/claude-code-router

https://github.com/SynkraAI/aiox-core

https://github.com/openai/codex-plugin-cc

https://github.com/diegosouzapw/OmniRoute
```

Também consultar as documentações oficiais de:

```text
https://docs.openclaw.ai/

https://elevenlabs.io/docs/

https://tauri.app/

https://git-scm.com/docs/git-worktree
```

Não presumir que a documentação, estrutura, comandos, APIs ou versões desses projetos continuam iguais.

Antes de integrar qualquer projeto:

1. verificar a versão atual;
2. verificar o último commit estável;
3. verificar releases;
4. verificar licença;
5. verificar linguagem e runtime;
6. verificar arquitetura;
7. verificar dependências;
8. verificar compatibilidade com Windows, Linux e macOS;
9. verificar APIs públicas;
10. verificar riscos de acoplamento;
11. verificar issues relevantes;
12. verificar limitações conhecidas;
13. verificar se existe protocolo oficial de integração;
14. verificar se é necessário fork;
15. verificar se é melhor usar subprocesso, sidecar, API, plugin, MCP, WebSocket ou biblioteca.

Criar o documento:

```text
docs/research/UPSTREAM_AUDIT.md
```

Esse documento deverá conter uma seção para cada projeto, com:

* função do projeto;
* capacidades úteis;
* componentes reutilizáveis;
* licença;
* limitações;
* riscos;
* decisão de integração;
* estratégia de atualização;
* commit ou release analisada;
* partes que não serão utilizadas;
* justificativa técnica.

---

# 4. DECISÃO ARQUITETURAL PRINCIPAL

O Ultron deverá começar como um **monólito modular local**, e não como uma coleção desnecessária de microserviços.

A aplicação será formada por:

```text
Ultron Desktop
    ↓
Ultron Control Plane
    ↓
Módulos internos
    ├── Conversation Engine
    ├── Personal Assistant Engine
    ├── Task Queue
    ├── Agent Orchestrator
    ├── Project Engine
    ├── Model Gateway
    ├── Integration Hub
    ├── Voice Engine
    ├── Memory Engine
    ├── Approval Engine
    ├── Event Store
    └── Audit Engine

Serviços e ferramentas externas
    ├── OpenClaw Gateway
    ├── Ollama
    ├── Claude Code
    ├── Codex CLI
    ├── Claude Code Router ou OmniRoute
    ├── ElevenLabs
    ├── Gmail
    ├── Google Calendar
    ├── WhatsApp
    └── GitHub
```

O sistema deverá ser modular internamente, mas implantado inicialmente com o menor número possível de processos.

Evitar:

* Kafka;
* Kubernetes;
* múltiplos bancos;
* Redis obrigatório;
* microsserviços sem necessidade;
* filas externas no MVP;
* service mesh;
* infraestrutura de nuvem obrigatória.

Esses elementos só poderão ser adicionados posteriormente, mediante ADR e necessidade comprovada.

---

# 5. OPENCLAW COMO FUNDAÇÃO DE INTEGRAÇÕES

O OpenClaw deverá ser utilizado inicialmente como um serviço externo gerenciado, chamado por um adapter próprio.

Não copie o núcleo do OpenClaw para dentro do Ultron sem necessidade comprovada.

A estratégia inicial deve ser:

```text
Ultron Control Plane
    ↓ WebSocket/RPC
OpenClaw Gateway
```

O Ultron deve implementar um módulo:

```text
OpenClawAdapter
```

Responsabilidades:

* descobrir Gateway local;
* conectar por WebSocket;
* autenticar;
* verificar saúde;
* listar capacidades;
* listar agentes;
* listar sessões;
* enviar mensagens;
* receber eventos;
* acompanhar tarefas;
* receber artefatos;
* receber solicitações de aprovação;
* acessar canais configurados;
* acompanhar falhas;
* reconectar automaticamente;
* executar backoff;
* manter heartbeat;
* mapear eventos do OpenClaw para eventos internos do Ultron;
* suportar Gateway local, WSL2, servidor remoto ou container;
* não reconstruir internamente o estado do OpenClaw apenas a partir de eventos incompletos;
* utilizar RPC para buscar estado autoritativo quando necessário.

Criar uma camada anticorrupção.

Nenhuma tela do frontend deverá depender diretamente do formato interno do OpenClaw.

Exemplo:

```text
OpenClaw Gateway Event
    ↓
OpenClawAdapter
    ↓
Ultron Domain Event
    ↓
Event Store
    ↓
WebSocket interno
    ↓
Interface
```

Se for necessário criar funcionalidades específicas para o Ultron dentro do OpenClaw, desenvolver um plugin separado:

```text
packages/openclaw-ultron-plugin
```

Esse plugin poderá expor:

* tools do Ultron;
* notificações;
* consulta de tarefas;
* criação de tarefas;
* consulta de projetos;
* consulta de aprovações;
* consulta de agenda consolidada;
* status do Control Plane;
* eventos do rosto;
* eventos de voz.

O plugin nunca deverá acessar segredos diretamente sem passar pelo sistema de permissões do Ultron.

---

# 6. ESCOLHA DO ROUTER DE MODELOS

Claude Code Router e OmniRoute possuem sobreposição funcional.

Não colocar os dois em sequência no mesmo caminho de requisição.

Não fazer:

```text
Ultron
→ Claude Code Router
→ OmniRoute
→ Provider
```

Também não fazer:

```text
Ultron
→ OmniRoute
→ Claude Code Router
→ Claude
```

Isso criaria:

* roteamento duplicado;
* fallback duplicado;
* contabilização inconsistente;
* dificuldade de auditoria;
* transformação duplicada de mensagens;
* risco de loops;
* problemas de compatibilidade;
* debugging desnecessariamente complexo.

Criar uma interface interna:

```typescript
interface RoutingEngine {
  route(request: RoutingRequest): Promise<RouteDecision>;
  execute(request: ModelRequest): Promise<ModelResponse>;
  stream(
    request: ModelRequest,
    callbacks: StreamCallbacks
  ): Promise<ModelRunHandle>;
  health(): Promise<RoutingHealth>;
  listProviders(): Promise<ProviderDescriptor[]>;
  listModels(): Promise<ModelDescriptor[]>;
}
```

Implementar adapters independentes:

```text
NativeRoutingEngine
ClaudeCodeRouterAdapter
OmniRouteAdapter
```

A configuração deverá permitir escolher apenas um engine principal:

```text
native
claude-code-router
omniroute
```

Um segundo engine poderá ser utilizado somente como executor explicitamente selecionado, nunca como proxy transparente encadeado sem visibilidade.

A decisão inicial recomendada é:

```text
NativeRoutingEngine como interface interna
ClaudeCodeRouterAdapter como primeira integração externa
OmniRouteAdapter como integração posterior e opcional
```

Se a auditoria técnica concluir que OmniRoute oferece melhor base, registrar a mudança em um ADR.

---

# 7. STACK TÉCNICA INICIAL

Usar versões estáveis atuais, verificadas no momento da implementação.

## Aplicativo desktop

```text
Tauri 2
Rust
React
TypeScript
Vite
Tailwind CSS
Radix UI ou shadcn/ui
TanStack Query
Zustand
React Router
React Flow
```

## Control Plane

```text
TypeScript
Node.js ou Bun
Fastify
WebSocket
Zod
Drizzle ORM
SQLite
SQLite WAL
Pino
OpenTelemetry opcional e local
```

Não escolher Bun ou Node apenas por preferência.

Antes, validar:

* empacotamento;
* suporte a subprocessos;
* suporte a PTY;
* estabilidade;
* bibliotecas necessárias;
* distribuição em Windows;
* execução como sidecar do Tauri;
* consumo de memória;
* compatibilidade com OpenClaw.

Registrar a decisão em:

```text
docs/adr/ADR-002-runtime-control-plane.md
```

## Testes

```text
Vitest
Playwright
Rust tests
Integration tests
Contract tests
Security tests
Fault-injection tests
```

## Banco

Inicialmente:

```text
SQLite
WAL habilitado
migrations versionadas
foreign keys habilitadas
busy timeout configurado
```

Não armazenar credenciais diretamente no SQLite.

## Segredos

Usar:

* Windows Credential Manager;
* macOS Keychain;
* Linux Secret Service;
* alternativa segura criptografada apenas quando o sistema nativo não estiver disponível.

O banco guarda somente referências para segredos:

```text
secret_ref
```

Nunca guardar:

```text
api_key em texto aberto
access_token em texto aberto
refresh_token em texto aberto
senha em texto aberto
cookies de navegador
```

---

# 8. ESTRUTURA DO MONOREPO

Criar uma estrutura semelhante a:

```text
ultron/
├── apps/
│   ├── desktop/
│   │   ├── src/
│   │   ├── src-tauri/
│   │   └── tests/
│   │
│   └── control-plane/
│       ├── src/
│       ├── tests/
│       └── migrations/
│
├── packages/
│   ├── domain/
│   ├── contracts/
│   ├── database/
│   ├── event-bus/
│   ├── task-queue/
│   ├── approval-engine/
│   ├── project-engine/
│   ├── agent-orchestrator/
│   ├── model-gateway/
│   ├── memory-engine/
│   ├── voice-engine/
│   ├── integration-sdk/
│   ├── security/
│   ├── observability/
│   ├── openclaw-adapter/
│   ├── openclaw-ultron-plugin/
│   ├── claude-code-adapter/
│   ├── codex-adapter/
│   ├── ollama-adapter/
│   ├── claude-code-router-adapter/
│   ├── omniroute-adapter/
│   ├── elevenlabs-adapter/
│   ├── gmail-adapter/
│   ├── calendar-adapter/
│   ├── whatsapp-adapter/
│   └── github-adapter/
│
├── upstream/
│   └── README.md
│
├── docs/
│   ├── architecture/
│   ├── adr/
│   ├── api/
│   ├── research/
│   ├── security/
│   ├── product/
│   ├── runbooks/
│   └── development/
│
├── scripts/
│   ├── setup/
│   ├── development/
│   ├── packaging/
│   ├── diagnostics/
│   └── migrations/
│
├── fixtures/
├── tests/
│   ├── integration/
│   ├── e2e/
│   ├── security/
│   └── performance/
│
├── .github/
│   └── workflows/
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE
└── AGENTS.md
```

A estrutura poderá ser ajustada após a auditoria, mas qualquer alteração relevante deverá ser justificada por ADR.

---

# 9. REGRAS DE DESENVOLVIMENTO

## 9.1 Não ocultar erros

Toda operação assíncrona deve registrar:

* início;
* progresso;
* conclusão;
* falha;
* cancelamento;
* timeout;
* retry;
* motivo;
* correlação.

Nunca transformar uma falha em resposta genérica como:

```text
Algo deu errado.
```

Exibir uma mensagem útil para o usuário e preservar detalhes técnicos nos logs.

## 9.2 Não simular funcionalidades

Não criar botões falsos.

Se uma integração ainda não estiver implementada:

* mostrar “Não disponível nesta versão”;
* não fingir conexão;
* não retornar dados simulados no ambiente de produção;
* usar mocks somente em desenvolvimento e testes;
* marcar dados simulados visualmente.

## 9.3 Não misturar interface e domínio

O frontend não deve:

* decidir roteamento;
* acessar providers diretamente;
* manipular tokens;
* executar shell;
* interpretar logs brutos como estado;
* controlar processos diretamente;
* acessar banco diretamente.

## 9.4 Não executar ações destrutivas silenciosamente

Ações perigosas devem passar pelo Approval Engine.

## 9.5 Não perguntar por detalhes já detectáveis

O sistema deve inspecionar o ambiente antes de pedir informações.

Exemplo:

* detectar Git instalado;
* detectar Node;
* detectar Bun;
* detectar Ollama;
* detectar OpenClaw;
* detectar Claude Code;
* detectar Codex;
* detectar WSL2;
* detectar GPU;
* detectar VRAM;
* detectar memória RAM;
* detectar espaço em disco.

---

# 10. MODELO DE DOMÍNIO

Criar entidades de domínio explícitas.

## Perfil

```text
UserProfile
DeviceProfile
WorkspaceProfile
```

## Integrações

```text
Integration
IntegrationAccount
IntegrationPermission
IntegrationHealth
IntegrationSyncCursor
```

## Providers e modelos

```text
Provider
ProviderCredential
Model
ModelCapability
ModelInstallation
RoutingProfile
RoutingRule
ProviderQuota
ProviderHealth
```

## Conversas

```text
Conversation
ConversationMessage
MessageAttachment
ToolCall
ToolResult
VoiceSession
```

## Projetos

```text
Project
ProjectRepository
ProjectEnvironment
ProjectCommand
ProjectTechnology
ProjectIndex
ProjectDecision
ProjectHealth
```

## Tarefas

```text
Task
TaskDependency
TaskRun
TaskStep
TaskEvent
TaskArtifact
TaskFailure
TaskRetry
```

## Agentes

```text
AgentDefinition
AgentInstance
AgentRun
AgentMessage
AgentToolPermission
AgentMemoryScope
AgentBudget
AgentCapability
AgentHandoff
```

## Aprovações

```text
ApprovalRequest
ApprovalDecision
ApprovalPolicy
ApprovalScope
```

## Memória

```text
MemoryItem
MemorySource
MemoryScope
MemoryEmbedding
MemoryRelation
MemoryRetentionPolicy
```

## Assistente pessoal

```text
TodoItem
Reminder
DailyBriefing
PersonalActivity
ExternalCommitment
SuggestedAction
```

## Auditoria e custos

```text
AuditEvent
UsageRecord
CostRecord
SecurityEvent
Notification
```

---

# 11. EVENT STORE E EVENTOS INTERNOS

Todas as mudanças importantes devem gerar eventos persistidos.

Criar um envelope padronizado:

```typescript
interface DomainEvent<TPayload = unknown> {
  id: string;
  schemaVersion: number;
  type: string;
  timestamp: string;

  aggregateType: string;
  aggregateId: string;

  correlationId: string;
  causationId?: string;

  source: {
    module: string;
    agentId?: string;
    providerId?: string;
    integrationId?: string;
  };

  payload: TPayload;
}
```

Exemplos de eventos:

```text
system.started
system.stopped
system.health.changed

integration.connected
integration.disconnected
integration.permission.changed
integration.sync.started
integration.sync.completed
integration.sync.failed

conversation.created
conversation.message.received
conversation.message.completed

voice.listening.started
voice.transcript.partial
voice.transcript.final
voice.response.started
voice.response.interrupted
voice.response.completed

task.created
task.planning.started
task.planning.completed
task.approval.requested
task.queued
task.started
task.paused
task.resumed
task.blocked
task.completed
task.failed
task.cancelled

task.step.started
task.step.progress
task.step.completed
task.step.failed

agent.assigned
agent.started
agent.message
agent.tool.started
agent.tool.completed
agent.handoff.created
agent.completed
agent.failed

project.added
project.index.started
project.index.completed
project.health.changed
project.file.changed
project.build.started
project.build.completed
project.test.started
project.test.completed

worktree.created
worktree.locked
worktree.removed
worktree.failed

approval.created
approval.approved
approval.rejected
approval.expired

model.route.requested
model.route.selected
model.request.started
model.response.first_token
model.response.completed
model.request.failed
model.fallback.used
model.rate_limited

notification.created
notification.read

security.action.blocked
security.policy.changed
```

A interface visual do fluxo de agentes deve ser construída a partir desses eventos reais.

Nunca animar agentes falsamente.

---

# 12. MÁQUINA DE ESTADOS DAS TAREFAS

Estados obrigatórios:

```text
draft
analyzing
planning
awaiting_approval
queued
leased
running
paused
blocked
reviewing
testing
awaiting_user
completed
failed
cancelled
dead_letter
```

Transições devem ser validadas no domínio.

Exemplo:

```text
draft
→ analyzing
→ planning
→ awaiting_approval
→ queued
→ leased
→ running
→ testing
→ reviewing
→ completed
```

Caminho de falha:

```text
running
→ failed
→ queued
→ running
→ failed
→ dead_letter
```

Caminho de bloqueio:

```text
running
→ blocked
→ awaiting_user
→ queued
```

Não permitir transições arbitrárias diretamente pelo frontend.

---

# 13. MOTOR DE FILAS

Criar uma fila local persistente baseada no banco.

Funcionalidades obrigatórias:

* persistência;
* prioridade;
* dependências;
* agendamento;
* retries;
* exponential backoff;
* jitter;
* timeout;
* heartbeat;
* leases;
* idempotência;
* cancelamento;
* pausa;
* retomada;
* dead-letter queue;
* concorrência configurável;
* limitação por projeto;
* limitação por provider;
* limitação por modelo;
* limitação por GPU;
* limitação por repositório;
* recuperação após encerramento inesperado;
* detecção de jobs abandonados;
* reprocessamento seguro;
* deduplicação;
* acompanhamento em tempo real.

Cada job deve possuir:

```text
id
task_id
type
priority
status
payload
result
attempt
max_attempts
available_at
lease_owner
lease_expires_at
timeout_at
resource_requirements
idempotency_key
correlation_id
created_at
updated_at
```

Recursos devem ser representados explicitamente:

```text
repository:<project-id>
gpu:0
provider:anthropic
provider:openai
model:qwen-local
integration:gmail
integration:whatsapp
```

Não executar duas tarefas de escrita sobre o mesmo worktree.

Não executar tarefas concorrentes que alterem a mesma branch sem isolamento.

---

# 14. MODELOS LOCAIS

Criar um módulo de gerenciamento de modelos locais.

A primeira integração será com Ollama.

Funcionalidades:

* detectar instalação;
* instalar somente mediante confirmação;
* listar modelos;
* pesquisar modelos compatíveis;
* baixar modelo;
* mostrar tamanho;
* mostrar espaço necessário;
* mostrar progresso;
* cancelar download;
* remover modelo;
* carregar modelo;
* descarregar modelo;
* verificar contexto;
* verificar capacidades;
* verificar suporte a visão;
* verificar suporte a tools;
* verificar quantização;
* mostrar uso de VRAM;
* mostrar uso de RAM;
* realizar benchmark;
* definir modelo padrão;
* definir modelo por perfil;
* configurar keep-alive;
* configurar contexto;
* verificar saúde;
* impedir downloads incompatíveis ou muito grandes sem alerta.

Antes de baixar, mostrar:

```text
Tamanho do download
Espaço após instalação
VRAM estimada
RAM estimada
Contexto configurado
Velocidade esperada aproximada
Capacidades
```

Não afirmar que um modelo caberá na GPU sem verificar.

Criar perfis:

```text
local-fast
local-balanced
local-coding
local-reasoning
local-vision
local-private
offline
```

Posteriormente, permitir llama.cpp e outros runtimes por adapter.

---

# 15. PROVIDERS E AUTENTICAÇÃO

Providers iniciais:

```text
OpenAI API
Codex CLI
Anthropic API
Claude Code CLI
Ollama
OpenRouter
Google Gemini
```

Posteriores:

```text
Azure OpenAI
Amazon Bedrock
Google Vertex AI
Groq
Mistral
DeepSeek
outros providers compatíveis
```

Diferenciar claramente:

```text
API provider
CLI executor
OAuth account
local runtime
router externo
```

Não tratar “conta do ChatGPT” como API key.

Para Codex:

* preferir autenticação oficial suportada pelo Codex CLI;
* não copiar cookies;
* não interceptar sessões;
* não armazenar tokens brutos no banco;
* permitir uso de API key quando configurado;
* detectar estado de login;
* detectar limites;
* detectar expiração.

Para Claude Code:

* usar login oficial ou API configurada;
* detectar instalação;
* detectar autenticação;
* detectar versão;
* não manipular arquivos internos de autenticação sem necessidade.

Implementar:

```text
CodexExecutor
ClaudeCodeExecutor
```

Cada executor deverá:

* iniciar processo;
* capturar stdout;
* capturar stderr;
* suportar streaming;
* suportar cancelamento;
* encerrar árvore de processos;
* acompanhar PID;
* detectar travamento;
* detectar rate limit;
* detectar autenticação expirada;
* detectar falta de permissão;
* capturar artefatos;
* registrar comandos;
* retornar resultado estruturado;
* limitar loops;
* limitar número de rodadas;
* suportar diretório de trabalho;
* suportar variáveis de ambiente controladas;
* nunca expor segredos nos logs.

---

# 16. ROUTER INTELIGENTE

Criar perfis de roteamento:

```text
voice-fast
chat-fast
chat-balanced
planning
architecture
coding
testing
code-review
deep-reasoning
vision
document-analysis
private-local
offline
cheap
high-quality
```

Cada perfil deve definir:

```text
capabilities required
preferred providers
preferred models
fallbacks
max latency
max cost
max tokens
local preference
privacy level
tool support requirement
vision requirement
context requirement
```

Exemplo:

```yaml
id: voice-fast
requirements:
  streaming: true
  max_first_token_ms: 1200
  tools: optional
policy:
  prefer_local: true
  fallbacks:
    - openai-fast
    - anthropic-fast
limits:
  max_output_tokens: 300
  max_cost_brl: 0.20
```

A unidade monetária deverá ser configurável.

Para a instalação pt-BR, exibir custos em R$ quando houver conversão ou tabela configurada.

Não inventar preços.

Guardar:

* moeda original;
* custo original;
* taxa de conversão utilizada;
* data da taxa;
* custo convertido.

Toda decisão de rota deve ser auditável.

Exibir:

```text
Perfil solicitado
Modelo escolhido
Provider
Motivo da escolha
Fallback utilizado
Latência
Tokens
Custo
```

Implementar:

* circuit breaker;
* health score;
* rate-limit awareness;
* quota awareness;
* fallback;
* retry controlado;
* timeout;
* preferência local;
* restrição de privacidade;
* orçamento por tarefa;
* orçamento diário;
* orçamento mensal;
* limite de concorrência;
* prevenção de fallback infinito.

---

# 17. DEFINIÇÃO DOS AGENTES

Um modelo não é um agente.

Criar um manifesto de agente:

```typescript
interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  role: string;

  instructions: string;
  routingProfileId: string;

  allowedTools: string[];
  deniedTools: string[];

  projectPermissions: string[];
  integrationPermissions: string[];

  memoryScopes: string[];

  limits: {
    timeoutMs: number;
    maxSteps: number;
    maxRetries: number;
    maxInputTokens?: number;
    maxOutputTokens?: number;
    maxCost?: number;
  };

  outputSchema?: unknown;
}
```

Agentes iniciais:

## Ultron Concierge

Responsável por:

* conversar com usuário;
* entender intenção;
* responder rapidamente;
* consultar estado;
* criar tarefas;
* informar progresso;
* não executar tarefas pesadas diretamente.

## Triage Agent

Responsável por:

* classificar solicitação;
* identificar contexto;
* escolher projeto;
* detectar urgência;
* separar conversa de trabalho;
* decidir se necessita tarefa.

## Planner Agent

Responsável por:

* analisar solicitação;
* criar plano;
* dividir etapas;
* identificar riscos;
* definir critérios de aceite;
* estimar dependências.

## Architect Agent

Responsável por:

* decisões arquiteturais;
* interfaces;
* schemas;
* contratos;
* riscos;
* ADRs.

## Developer Agent

Responsável por:

* implementar;
* alterar arquivos;
* executar comandos permitidos;
* produzir resumo de alterações.

## Test Agent

Responsável por:

* criar testes;
* executar testes;
* investigar falhas;
* produzir relatório reproduzível.

## Review Agent

Responsável por:

* revisar diff;
* procurar regressões;
* procurar falhas de segurança;
* validar requisitos;
* reprovar trabalho incompleto.

## Integration Agent

Responsável por:

* integrar branches;
* resolver conflitos autorizados;
* executar suíte final;
* preparar merge.

## Personal Assistant Agent

Responsável por:

* tarefas;
* agenda;
* mensagens;
* compromissos;
* briefing diário;
* acompanhamento pessoal.

## Email Agent

Responsável por:

* pesquisar mensagens;
* resumir;
* criar rascunhos;
* nunca enviar sem política apropriada.

## Calendar Agent

Responsável por:

* consultar agenda;
* encontrar conflitos;
* sugerir horários;
* criar eventos somente com permissão.

Na primeira versão funcional, habilitar apenas:

```text
Ultron Concierge
Triage Agent
Planner Agent
Developer Agent
Review Agent
```

Os demais entram em fases posteriores.

---

# 18. ORQUESTRAÇÃO DINÂMICA

Não executar todos os agentes para todas as tarefas.

Exemplos:

## Conversa simples

```text
Ultron Concierge
```

## Pergunta sobre projeto

```text
Ultron Concierge
→ Project Query Tool
```

## Correção pequena

```text
Triage
→ Developer
→ Test
```

## Alteração média

```text
Triage
→ Planner
→ Developer
→ Review
```

## Sistema novo

```text
Triage
→ Planner
→ Architect
→ múltiplos Developers
→ Test
→ Review
→ Integration
```

## Revisão crítica

```text
Claude Code
→ Codex Review
→ Claude Code Verification
```

Definir limites rígidos:

```text
max_handoffs
max_review_rounds
max_retries
max_total_steps
max_total_cost
max_total_time
```

Nunca permitir debate infinito entre agentes.

---

# 19. AGENT HANDOFF

Todo handoff deve possuir:

```text
source_agent
target_agent
task_id
reason
input_summary
required_artifacts
expected_output
constraints
deadline
budget
```

O agente de destino não deve receber todo o histórico bruto indiscriminadamente.

Criar um Context Builder que selecione:

* objetivo;
* requisitos;
* arquivos relevantes;
* decisões;
* erros;
* testes;
* artefatos;
* orçamento;
* permissões;
* resumo de conversas anteriores.

Registrar tudo que foi removido ou resumido.

---

# 20. PROJECT ENGINE

O usuário poderá adicionar projetos por seletor nativo de pasta.

O Ultron nunca deve escanear o disco inteiro sem autorização.

Ao adicionar um projeto:

1. validar caminho;
2. verificar permissões;
3. detectar Git;
4. detectar branch;
5. detectar arquivos modificados;
6. detectar stack;
7. detectar gerenciador de pacotes;
8. detectar scripts;
9. detectar testes;
10. detectar build;
11. detectar lint;
12. detectar documentação;
13. detectar arquivos de instrução;
14. detectar `AGENTS.md`;
15. detectar `CLAUDE.md`;
16. detectar arquivos de configuração de Codex;
17. detectar Docker;
18. detectar variáveis de ambiente sem ler segredos;
19. criar índice inicial;
20. criar resumo técnico.

Stacks inicialmente detectáveis:

```text
Node.js
TypeScript
JavaScript
React
Next.js
Vite
Python
FastAPI
Django
Rust
Tauri
Docker
PostgreSQL
SQLite
```

Criar interface para adicionar detectores.

Cada projeto deve exibir:

* nome;
* caminho;
* repositório;
* branch;
* status Git;
* tecnologias;
* comandos;
* tarefas;
* agentes ativos;
* fila;
* build;
* testes;
* erros;
* últimas alterações;
* custo;
* decisões;
* saúde;
* última atividade.

---

# 21. ISOLAMENTO POR GIT WORKTREE

Nenhum agente deve editar automaticamente a branch principal.

Fluxo padrão:

```text
Projeto principal
    ↓
Criar task
    ↓
Criar branch
    ↓
Criar worktree isolado
    ↓
Executar agente
    ↓
Testar
    ↓
Revisar
    ↓
Solicitar aprovação
    ↓
Integrar
```

Estrutura:

```text
~/.ultron/worktrees/
└── <project-id>/
    └── <task-id>/
```

Branch:

```text
ultron/task-<task-id>-<slug>
```

Implementar:

* criação;
* lock;
* validação;
* reparo;
* limpeza;
* expiração;
* remoção segura;
* detecção de worktree órfão;
* proteção de branch;
* proteção contra path traversal;
* rollback;
* comparação de diff;
* merge controlado.

Não remover worktree se houver alterações não preservadas.

Não executar:

```text
git reset --hard
git clean -fd
git push --force
git branch -D
```

sem aprovação explícita.

---

# 22. APROVAÇÕES

Criar níveis de autonomia:

## Modo Observação

Pode:

* ler dados autorizados;
* consultar status;
* resumir;
* recomendar.

Não pode alterar nada.

## Modo Assistência

Pode:

* criar planos;
* criar rascunhos;
* preparar ações;
* criar tarefas.

Exige aprovação para executar.

## Modo Execução Controlada

Pode executar ações previamente autorizadas dentro de escopos limitados.

## Modo Autonomia Delimitada

Pode executar automaticamente somente regras explícitas com:

* escopo;
* duração;
* orçamento;
* contatos;
* projetos;
* comandos;
* limite de ações.

Tipos de aprovação:

```text
read_sensitive_file
write_file
delete_file
execute_command
execute_privileged_command
install_dependency
install_model
network_request
send_email
send_whatsapp
create_calendar_event
update_calendar_event
delete_calendar_event
git_commit
git_merge
git_push
git_force_operation
access_new_folder
use_paid_provider
exceed_budget
```

Cada solicitação deverá mostrar:

* ação;
* agente;
* motivo;
* projeto;
* impacto;
* comando;
* arquivos;
* destinatário;
* custo;
* risco;
* tempo de expiração.

Permitir:

```text
Aprovar uma vez
Aprovar nesta tarefa
Aprovar neste projeto
Sempre permitir esta ação específica
Rejeitar
```

Nunca transformar “aprovar uma vez” em permissão permanente.

---

# 23. INTERFACE PRINCIPAL

A Home será o centro do sistema.

Estrutura sugerida:

```text
┌───────────────────────────────────────────────────────────┐
│ Navegação        │ Ultron / Conversa      │ Seu dia       │
│                  │                        │               │
│ Home             │ Rosto animado          │ Agenda        │
│ Projetos         │ Chat                   │ Pendências    │
│ Tarefas          │ Voz                    │ Aprovações    │
│ Agentes          │ Anexos                 │ Mensagens     │
│ Modelos          │                        │ Erros         │
│ Integrações      │                        │               │
│ Memória          │                        │               │
│ Logs             │                        │               │
│ Configurações    │                        │               │
├───────────────────────────────────────────────────────────┤
│ Atividade: agentes, tarefas, filas, progresso e falhas    │
└───────────────────────────────────────────────────────────┘
```

A interface deve ser responsiva, mas desktop-first.

Não criar um dashboard excessivamente poluído.

O rosto do assistente deve ser o elemento central da Home, mas não pode impedir o uso profissional da aplicação.

---

# 24. ROSTO E PERSONAGEM

Criar um sistema de avatar original.

Começar com uma implementação 2D.

Avaliar:

```text
Rive
Live2D
sprites
SVG animado
Canvas 2D
```

A primeira opção recomendada é Rive ou um sistema de SVG animado, sujeito à auditoria técnica e licenciamento.

Estados obrigatórios:

```text
idle
listening
hearing
thinking
speaking
working
success
warning
error
offline
sleeping
privacy
awaiting_approval
interrupted
```

Cada estado deve ser acionado por eventos reais.

Exemplo:

```text
voice.listening.started → listening
voice.transcript.partial → hearing
model.request.started → thinking
voice.response.started → speaking
task.started → working
task.completed → success
task.failed → error
approval.created → awaiting_approval
system.offline → offline
```

Funcionalidades:

* respiração sutil;
* piscadas;
* movimento de olhar;
* expressão;
* movimento de boca;
* transições;
* redução de movimento;
* modo sem animação;
* opção de ocultar rosto;
* diferentes skins futuramente;
* controle de intensidade de animação.

Não bloquear a resposta textual enquanto a animação carrega.

---

# 25. SINCRONIZAÇÃO LABIAL

Implementar em camadas:

## Camada 1

Sincronização por amplitude do áudio.

## Camada 2

Mapeamento por alinhamento de palavras, quando o provider disponibilizar.

## Camada 3

Visemas e fonemas, se o provider e o avatar suportarem.

Criar uma interface:

```typescript
interface LipSyncDriver {
  start(session: VoicePlaybackSession): void;
  update(frame: AudioAnalysisFrame): void;
  stop(): void;
}
```

Se o lip sync falhar, a voz deve continuar normalmente.

---

# 26. CONVERSA

A conversa deverá suportar:

* texto;
* Markdown;
* streaming;
* code blocks;
* anexos;
* imagens;
* PDFs;
* áudio;
* referência a projeto;
* referência a tarefa;
* referência a mensagens;
* referência a eventos;
* tools;
* interrupção;
* regeneração;
* edição de mensagem;
* branches de conversa;
* histórico;
* pesquisa;
* exclusão;
* exportação.

Toda resposta sobre estado do sistema deve usar dados estruturados.

Exemplo ruim:

```text
Acho que o projeto está quase terminado.
```

Exemplo correto:

```text
O projeto possui 7 tarefas:
- 4 concluídas;
- 2 em execução;
- 1 bloqueada.

A tarefa bloqueada depende da variável TIKA_URL.
```

O sistema deve mostrar a origem dos dados.

---

# 27. CLASSIFICAÇÃO DE INTENÇÃO

Antes de enviar uma solicitação para fluxo pesado, classificar:

```text
conversation
system_query
project_query
task_creation
task_control
integration_query
personal_productivity
calendar_action
email_action
whatsapp_action
model_management
settings_action
```

A classificação poderá usar:

1. regras determinísticas;
2. modelo local rápido;
3. fallback para modelo remoto.

A solicitação original nunca deve ser descartada.

Quando uma tarefa longa for criada, responder rapidamente:

```text
Entendi. Criei a tarefa e iniciei a análise.
```

Depois fornecer:

* ID da tarefa;
* projeto;
* agente;
* etapa;
* acesso ao painel;
* progresso.

A resposta por voz não deve esperar o trabalho completo.

---

# 28. VOZ

Utilizar ElevenLabs como integração principal de voz.

Criar adapters:

```text
ElevenLabsSttAdapter
ElevenLabsTtsAdapter
ElevenLabsRealtimeAdapter
```

Suportar:

* STT streaming;
* transcrição parcial;
* transcrição final;
* TTS streaming;
* áudio parcial;
* interrupção;
* reconexão;
* seleção de voz;
* velocidade;
* estabilidade;
* volume;
* cache seguro;
* tratamento de limite;
* estimativa de custo;
* fallback.

Fluxo:

```text
Microfone
→ VAD
→ STT streaming
→ transcrição parcial
→ transcrição final
→ intent classifier
→ modelo rápido
→ texto em streaming
→ TTS streaming
→ reprodução
→ lip sync
```

Primeira versão:

```text
push-to-talk
```

Não começar com microfone permanentemente aberto.

Fases posteriores:

* wake word;
* escuta contínua;
* barge-in;
* detecção de fim de fala;
* seleção automática de microfone;
* cancelamento de eco;
* supressão de ruído;
* modo mãos livres.

Criar fallback local opcional:

```text
STT local
TTS local
```

A escolha local poderá utilizar soluções compatíveis disponíveis no momento da implementação, desde que a licença seja verificada.

A conversa textual deve continuar funcionando se a ElevenLabs estiver indisponível.

---

# 29. CENTRAL PESSOAL

O Ultron deverá responder:

```text
O que tenho para fazer hoje?
O que está atrasado?
O que foi concluído?
O que está aguardando minha aprovação?
O que deu erro?
Quais projetos precisam de atenção?
Quais mensagens são importantes?
Qual é minha agenda?
```

Criar uma visão consolidada com:

* tarefas internas;
* agenda;
* compromissos detectados;
* mensagens;
* aprovações;
* erros;
* projetos;
* lembretes;
* tarefas sugeridas.

Cada item deve mostrar a origem:

```text
Criado pelo usuário
Google Calendar
Gmail
WhatsApp
Projeto
Agente
Erro do sistema
Inferido pelo Ultron
```

Itens inferidos não podem se tornar compromissos confirmados sem aprovação.

---

# 30. DIÁRIO DE ATIVIDADES

Registrar atividades relevantes:

```text
Tarefa criada
Tarefa concluída
Projeto alterado
Commit criado
Teste executado
Build concluído
Erro detectado
Aprovação fornecida
Mensagem enviada
Evento criado
Reunião realizada
Decisão registrada
```

O usuário poderá perguntar:

```text
O que eu fiz hoje?
O que aconteceu no Painel Alpha?
O que foi concluído esta semana?
Quanto foi gasto com IA neste projeto?
```

O Diário deverá distinguir:

```text
Ação do usuário
Ação do Ultron
Ação de agente
Evento externo
Ação automática
```

Não tratar ações do agente como ações pessoais do usuário sem identificação.

---

# 31. GMAIL

A integração Gmail será opcional e desligada por padrão.

Autenticação por OAuth oficial.

Permissões progressivas:

## Nível 1 — Metadados

* remetente;
* assunto;
* data;
* labels;
* não lidas.

## Nível 2 — Leitura

* conteúdo;
* anexos autorizados;
* pesquisa;
* resumo.

## Nível 3 — Rascunhos

* criar rascunho;
* editar rascunho.

## Nível 4 — Envio aprovado

* enviar somente após aprovação.

## Nível 5 — Automação delimitada

* enviar apenas dentro de regras explícitas.

Funcionalidades:

* listar mensagens importantes;
* resumir inbox;
* pesquisar;
* agrupar threads;
* identificar tarefas;
* identificar datas;
* sugerir respostas;
* criar rascunhos;
* enviar com aprovação;
* detectar falhas;
* relacionar mensagens a projetos;
* não indexar tudo sem autorização.

Suportar:

* sincronização incremental;
* cursor;
* reautenticação;
* token expirado;
* rate limit;
* desconexão;
* remoção de dados locais.

Para notificações em tempo real, avaliar Gmail Pub/Sub.

Se Pub/Sub não estiver configurado, implementar polling configurável como fallback, deixando claro ao usuário.

Conteúdo de e-mail é entrada não confiável.

Nunca permitir que instruções dentro de um e-mail provoquem execução de shell, envio de mensagens ou acesso a arquivos sem passar pelas políticas.

---

# 32. GOOGLE CALENDAR

Integração opcional.

Permissões:

```text
Leitura
Criação com aprovação
Edição com aprovação
Exclusão com aprovação
Autonomia delimitada
```

Funcionalidades:

* agenda diária;
* agenda semanal;
* conflitos;
* eventos futuros;
* busca;
* criação;
* edição;
* cancelamento;
* participantes;
* links;
* lembretes;
* associação a projetos;
* briefing pré-reunião;
* resumo pós-reunião;
* sugestão de horários.

Antes de criar ou editar um evento, mostrar:

* título;
* data;
* horário;
* fuso;
* duração;
* participantes;
* descrição;
* calendário;
* conflitos.

Tratar corretamente o fuso horário.

Não assumir UTC.

---

# 33. WHATSAPP

A integração inicial poderá utilizar o plugin de WhatsApp do OpenClaw.

A integração deve ser opcional.

Modos:

```text
Desconectado
Somente leitura
Assistência
Envio com aprovação
Comandos permitidos
Autonomia delimitada
```

Configurações:

* conexão por QR;
* conta;
* contatos permitidos;
* contatos bloqueados;
* grupos permitidos;
* exigir menção;
* aceitar comandos;
* permitir mídia;
* horário de silêncio;
* política de resposta;
* limite de mensagens;
* envio com aprovação;
* respostas automáticas específicas.

Diferenciar:

```text
mensagem recebida
comando reconhecido
pedido de ação
conteúdo comum
conteúdo não confiável
```

Uma mensagem externa nunca deve possuir autoridade automática sobre a máquina.

Exemplo:

```text
“Apague todos os arquivos desse projeto”
```

Mesmo que recebida de um contato permitido, deverá exigir aprovação local, salvo regra extremamente específica e conscientemente configurada.

Adicionar futuramente adapter para API oficial do WhatsApp/Meta.

Não acoplar o domínio do Ultron diretamente a Baileys.

---

# 34. INTEGRATION HUB

Criar catálogo de integrações.

Cada integração deve apresentar:

```text
Nome
Descrição
Provider
Status
Conta
Permissões
Última sincronização
Último erro
Dados armazenados
Desconectar
Remover dados
Testar conexão
```

Estados:

```text
not_installed
not_configured
connecting
connected
degraded
expired
paused
error
disabled
```

Integrações iniciais:

```text
OpenClaw
Ollama
Claude Code
Codex
ElevenLabs
Gmail
Google Calendar
WhatsApp
GitHub
```

Futuras:

```text
Google Drive
Slack
Discord
Telegram
Microsoft Teams
Notion
Trello
Jira
Linear
GitLab
OneDrive
```

Criar um SDK de integrações:

```typescript
interface IntegrationAdapter {
  descriptor(): IntegrationDescriptor;
  connect(input: ConnectionInput): Promise<ConnectionResult>;
  disconnect(): Promise<void>;
  health(): Promise<IntegrationHealth>;
  capabilities(): Promise<IntegrationCapability[]>;
  sync?(cursor?: string): Promise<SyncResult>;
}
```

---

# 35. MEMÓRIA

Separar memória em camadas:

## Memória de conversa

Contexto recente da conversa.

## Memória episódica

Eventos e interações relevantes.

## Memória semântica

Fatos, decisões e conhecimento.

## Memória pessoal

Preferências e informações explicitamente autorizadas.

## Memória de projeto

Arquitetura, decisões, erros, comandos e padrões.

## Memória operacional

Estado de tarefas, filas e execuções.

## Memória externa

Dados de Gmail, Calendar e WhatsApp, com origem e política de retenção.

Toda memória deve possuir:

```text
id
content
source
scope
confidence
created_at
updated_at
expires_at
sensitivity
user_confirmed
project_id
conversation_id
external_reference
```

O usuário deve poder:

* visualizar;
* pesquisar;
* editar;
* corrigir;
* apagar;
* desativar memória;
* exportar;
* definir retenção;
* impedir que determinada conversa seja memorizada.

Não salvar automaticamente dados sensíveis sem necessidade e autorização.

Nunca misturar memória pessoal entre perfis.

Começar com:

```text
SQLite FTS5
metadados estruturados
resumos
```

Adicionar embeddings somente depois que o armazenamento, origem, exclusão e permissões estiverem consolidados.

---

# 36. CONTEXTO DE PROJETOS

Não enviar o projeto inteiro para todos os modelos.

Criar indexador que identifique:

* estrutura;
* arquivos relevantes;
* símbolos;
* imports;
* dependências;
* documentação;
* arquivos modificados;
* erros;
* testes;
* decisões anteriores.

Context Builder deverá produzir pacotes contextuais.

Exemplo:

```text
TaskContext
├── objective
├── acceptance_criteria
├── project_summary
├── relevant_files
├── relevant_symbols
├── previous_failures
├── test_commands
├── constraints
├── decisions
└── permissions
```

Registrar:

* arquivos enviados;
* tamanho;
* tokens estimados;
* resumo;
* modelo destinatário.

Nunca enviar arquivos secretos.

Bloquear por padrão:

```text
.env
.env.*
private keys
credentials
tokens
browser profiles
SSH keys
database dumps
```

---

# 37. FLUXO VISUAL DE AGENTES

Criar tela usando React Flow ou solução equivalente.

A tela deve mostrar:

* agentes;
* tarefas;
* conexões;
* handoffs;
* etapa atual;
* estado;
* modelo;
* provider;
* duração;
* tokens;
* custo;
* ferramentas;
* arquivos;
* erros.

Estados visuais:

```text
Aguardando
Na fila
Executando
Concluído
Falhou
Bloqueado
Pausado
Cancelado
```

Ao clicar em um agente:

* instrução;
* tarefa;
* modelo;
* provider;
* logs;
* tools;
* artefatos;
* entradas;
* saídas;
* tempo;
* custo.

Ao clicar em uma conexão:

* motivo do handoff;
* resumo transferido;
* artefatos;
* restrições;
* resultado esperado.

Não mostrar raciocínio privado interno do modelo.

Mostrar:

* resumo operacional;
* decisões;
* ações;
* tools;
* resultados;
* justificativa curta;
* erros.

---

# 38. TELA DE FILA

Exibir:

```text
Processando agora
Próximas tarefas
Aguardando aprovação
Bloqueadas
Falhas
Concluídas
Dead letter
```

Cada item:

* prioridade;
* posição;
* projeto;
* agente;
* etapa;
* modelo;
* duração;
* dependências;
* tentativas;
* custo;
* progresso;
* recursos ocupados.

Ações:

* pausar;
* retomar;
* cancelar;
* reordenar;
* aumentar prioridade;
* reduzir prioridade;
* reexecutar;
* abrir logs;
* abrir projeto;
* aprovar;
* rejeitar.

Reordenar não pode violar dependências.

---

# 39. OBSERVABILIDADE

Registrar métricas:

```text
time_to_first_token
total_latency
queue_wait_time
execution_time
tokens_in
tokens_out
cache_hits
estimated_cost
provider_errors
model_errors
tool_errors
retries
fallbacks
agent_steps
voice_latency
stt_latency
tts_latency
```

Dimensões:

```text
provider
model
agent
task
project
integration
day
month
```

Criar dashboards:

* saúde do sistema;
* modelos;
* providers;
* agentes;
* tarefas;
* custos;
* voz;
* integrações;
* erros.

Telemetria externa deverá estar desligada por padrão.

Logs locais não devem incluir:

* API keys;
* refresh tokens;
* conteúdo sensível integral;
* senhas;
* cookies;
* chaves privadas.

Implementar redaction centralizada.

---

# 40. SEGURANÇA

Criar threat model em:

```text
docs/security/THREAT_MODEL.md
```

Cobrir:

* prompt injection;
* shell injection;
* path traversal;
* acesso indevido a arquivos;
* exposição de tokens;
* plugins maliciosos;
* mensagens maliciosas;
* e-mails maliciosos;
* dependências comprometidas;
* supply chain;
* execução remota;
* Gateway exposto;
* WebSocket sem autenticação;
* sessão sequestrada;
* subprocesso órfão;
* elevação de privilégio;
* exfiltração;
* vazamento de logs;
* exclusão destrutiva;
* agente fora de controle;
* loops de custo;
* download malicioso de modelo;
* update comprometido.

Princípios:

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

Criar kill switch global.

O kill switch deve:

* impedir novas execuções;
* cancelar jobs;
* interromper subprocessos;
* bloquear mensagens;
* interromper voz;
* preservar logs;
* não corromper banco;
* não remover arquivos.

---

# 41. SANDBOX E COMANDOS

Classificar comandos:

## Leitura segura

```text
git status
git diff
ls
dir
cat de arquivos autorizados
testes sem alteração
```

## Alteração controlada

```text
instalação de dependências
build
geração de arquivos
migração local
commit
```

## Perigoso

```text
sudo
rm recursivo
del recursivo
format
diskpart
reg delete
git reset --hard
git clean
force push
alteração de firewall
alteração de usuários
execução baixada da internet
```

Criar parser de comandos e política.

Não confiar apenas em comparação textual simples.

Executar processos com:

* cwd específico;
* ambiente reduzido;
* timeout;
* limite de saída;
* cancelamento;
* captura de PID;
* captura de exit code;
* limite de memória quando possível;
* isolamento de rede quando possível.

---

# 42. NOTIFICAÇÕES

Canais:

```text
in-app
desktop
voz
WhatsApp
e-mail
```

Eventos notificáveis:

* tarefa concluída;
* tarefa falhou;
* aprovação necessária;
* integração expirou;
* compromisso próximo;
* mensagem prioritária;
* orçamento excedido;
* modelo indisponível;
* projeto bloqueado.

Configurações:

* quiet hours;
* prioridade;
* agrupamento;
* deduplicação;
* som;
* voz;
* canal;
* projeto;
* tipo de evento.

Não enviar a mesma notificação repetidamente.

---

# 43. ONBOARDING

Criar onboarding por etapas.

## Etapa 1 — Boas-vindas

Explicar:

* local-first;
* integrações opcionais;
* permissões;
* riscos de automação.

## Etapa 2 — Diagnóstico

Detectar:

```text
Sistema operacional
CPU
RAM
GPU
VRAM
Disco
Git
Node
Bun
Rust
Ollama
WSL2
OpenClaw
Claude Code
Codex
```

## Etapa 3 — Assistente

Configurar:

* nome;
* idioma;
* voz;
* aparência;
* animação;
* privacidade.

## Etapa 4 — Modelos

Escolher:

* local;
* OpenAI;
* Claude;
* outros.

## Etapa 5 — OpenClaw

Opções:

```text
Conectar Gateway existente
Instalar localmente
Usar WSL2
Conectar servidor remoto
Configurar depois
```

## Etapa 6 — Projetos

Adicionar primeira pasta.

## Etapa 7 — Integrações

Todas opcionais.

## Etapa 8 — Segurança

Escolher modo de autonomia.

## Etapa 9 — Teste

Executar:

* chat;
* modelo;
* voz;
* projeto;
* notificação.

O onboarding deve poder ser retomado.

---

# 44. WINDOWS, LINUX E MACOS

Prioridade inicial:

```text
Windows 11
```

Arquitetura pronta para:

```text
Linux
macOS
```

No Windows:

* detectar WSL2;
* não instalar WSL2 silenciosamente;
* explicar quando é necessário;
* permitir Gateway OpenClaw remoto;
* permitir Gateway em WSL2;
* permitir Control Plane nativo;
* gerenciar caminhos Windows↔WSL com cuidado;
* não misturar caminhos sem normalização;
* testar espaços e caracteres especiais;
* testar múltiplos discos;
* testar Git Bash, PowerShell e WSL.

Criar uma abstração:

```text
RuntimeLocation
├── native
├── wsl
├── docker
└── remote
```

---

# 45. API INTERNA

Criar API versionada:

```text
/api/v1
```

Endpoints iniciais:

```text
GET    /health
GET    /system/status
GET    /system/capabilities

GET    /projects
POST   /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id
POST   /projects/:id/index
GET    /projects/:id/health

GET    /tasks
POST   /tasks
GET    /tasks/:id
POST   /tasks/:id/pause
POST   /tasks/:id/resume
POST   /tasks/:id/cancel
POST   /tasks/:id/retry

GET    /agents
POST   /agents
GET    /agents/:id
PATCH  /agents/:id

GET    /providers
GET    /models
POST   /models/install
DELETE /models/:id
POST   /models/:id/load
POST   /models/:id/unload

GET    /integrations
POST   /integrations/:id/connect
POST   /integrations/:id/disconnect
POST   /integrations/:id/test

GET    /approvals
POST   /approvals/:id/approve
POST   /approvals/:id/reject

GET    /conversations
POST   /conversations
POST   /conversations/:id/messages

GET    /memory
DELETE /memory/:id

GET    /audit
GET    /usage
GET    /notifications
```

WebSocket:

```text
/ws
```

Suportar:

* autenticação;
* subscribe;
* unsubscribe;
* replay;
* cursor;
* reconnect;
* heartbeat;
* event versioning.

---

# 46. BANCO DE DADOS

Criar migrations para tabelas mínimas:

```text
profiles
settings
secret_references

integrations
integration_accounts
integration_permissions
integration_sync_state

providers
models
model_installations
routing_profiles
routing_rules

agents
agent_permissions
agent_runs
agent_handoffs

projects
project_commands
project_technologies
project_decisions
project_health_snapshots

tasks
task_dependencies
task_runs
task_steps
task_events
task_artifacts
task_failures

worktrees
approvals

conversations
messages
attachments
tool_calls

todo_items
reminders
daily_briefings
personal_activities

memory_items
memory_sources

usage_records
cost_records
audit_events
security_events
notifications

voice_sessions
```

Adicionar índices adequados.

Testar migrations:

* banco vazio;
* atualização;
* rollback quando possível;
* corrupção simulada;
* backup;
* restore.

---

# 47. BACKUP E RESTAURAÇÃO

Criar sistema de backup.

Itens:

* banco;
* configurações;
* manifests;
* memória;
* projetos cadastrados;
* agentes;
* workflows;
* integrações sem segredos;
* referências de segredos;
* artefatos selecionados.

Não exportar tokens por padrão.

Formato:

```text
.ultron-backup
```

Implementar:

* backup manual;
* backup automático;
* retenção;
* validação;
* checksum;
* criptografia opcional;
* restore;
* dry run;
* relatório.

Não incluir worktrees descartáveis sem opção explícita.

---

# 48. ATUALIZAÇÃO

Criar updater seguro.

Requisitos:

* assinatura;
* checksum;
* canal stable;
* canal beta;
* rollback;
* backup antes de atualizar;
* migrations seguras;
* notas da versão;
* confirmação;
* atualização de sidecars;
* atualização separada do OpenClaw;
* compatibilidade de versão.

Não atualizar automaticamente componentes externos sem informar o usuário.

Manter matriz de compatibilidade:

```text
Ultron
OpenClaw
Control Plane
Plugin Ultron
Claude Code
Codex
Ollama
```

---

# 49. DOCUMENTAÇÃO OBRIGATÓRIA

Criar:

```text
README.md
CONTRIBUTING.md
SECURITY.md
AGENTS.md

docs/product/PRODUCT_SPEC.md
docs/product/USER_FLOWS.md

docs/architecture/OVERVIEW.md
docs/architecture/COMPONENTS.md
docs/architecture/EVENTS.md
docs/architecture/DATABASE.md
docs/architecture/INTEGRATIONS.md
docs/architecture/VOICE.md
docs/architecture/AGENTS.md
docs/architecture/QUEUE.md

docs/security/THREAT_MODEL.md
docs/security/PERMISSIONS.md
docs/security/SECRET_STORAGE.md

docs/development/SETUP_WINDOWS.md
docs/development/SETUP_LINUX.md
docs/development/SETUP_MACOS.md
docs/development/TESTING.md
docs/development/DEBUGGING.md

docs/runbooks/OPENCLAW.md
docs/runbooks/OLLAMA.md
docs/runbooks/CLAUDE_CODE.md
docs/runbooks/CODEX.md
docs/runbooks/VOICE.md
docs/runbooks/BACKUP_RESTORE.md
```

---

# 50. ADRS OBRIGATÓRIOS

Criar pelo menos:

```text
ADR-001-modular-monolith.md
ADR-002-runtime-control-plane.md
ADR-003-openclaw-integration.md
ADR-004-model-routing.md
ADR-005-database.md
ADR-006-task-queue.md
ADR-007-secret-storage.md
ADR-008-project-isolation.md
ADR-009-voice-pipeline.md
ADR-010-memory.md
ADR-011-windows-wsl-strategy.md
ADR-012-plugin-system.md
```

Formato:

```text
Context
Decision
Alternatives
Consequences
Status
Date
```

---

# 51. FASES DE IMPLEMENTAÇÃO

## FASE 0 — AUDITORIA, PESQUISA E ARQUITETURA

Objetivo:

Entender o ambiente e validar as decisões antes de criar integrações profundas.

Entregas:

* auditoria dos projetos de referência;
* auditoria do ambiente local;
* mapa de capacidades;
* matriz de build vs reuse;
* threat model inicial;
* ADRs iniciais;
* arquitetura;
* roadmap;
* riscos;
* licença;
* definição do MVP.

Critérios de aceite:

* nenhum projeto usado sem licença verificada;
* nenhuma capacidade presumida;
* estratégia OpenClaw documentada;
* estratégia Windows/WSL documentada;
* router principal escolhido;
* arquitetura aprovada;
* riscos registrados.

---

## FASE 1 — FUNDAÇÃO DO MONOREPO

Objetivo:

Criar estrutura, qualidade e desenvolvimento local.

Entregas:

* workspace;
* lint;
* format;
* TypeScript;
* Tauri;
* Control Plane;
* testes;
* CI;
* migrations;
* logging;
* configuração;
* documentação inicial.

Critérios:

```text
pnpm install
pnpm dev
pnpm build
pnpm test
pnpm lint
```

devem funcionar.

Criar primeira tela mostrando:

* status do desktop;
* status do Control Plane;
* versão;
* banco;
* uptime.

---

## FASE 2 — CONTROL PLANE E EVENT BUS

Objetivo:

Criar o núcleo operacional.

Entregas:

* Fastify;
* WebSocket;
* Event Store;
* Event Bus;
* health checks;
* configuração;
* banco;
* auditoria;
* erros padronizados;
* correlation IDs.

Critérios:

* evento persistido;
* evento enviado para interface;
* reconexão;
* replay;
* teste de reinício;
* teste de falha.

---

## FASE 3 — OPENCLAW ADAPTER

Objetivo:

Conectar o Ultron ao Gateway sem acoplamento direto.

Entregas:

* descoberta;
* autenticação;
* WebSocket;
* RPC;
* health;
* reconexão;
* mapeamento de eventos;
* tela de status;
* instalação ou conexão assistida;
* suporte a local, WSL e remoto.

Critérios:

* conectar;
* desconectar;
* reiniciar;
* recuperar;
* enviar mensagem;
* receber resposta;
* mostrar erro;
* manter logs;
* não expor token.

---

## FASE 4 — PROVIDERS, MODELOS E ROUTER

Objetivo:

Permitir uso de modelos locais e remotos.

Entregas:

* Provider SDK;
* Ollama;
* OpenAI;
* Claude;
* Codex;
* health;
* perfis;
* fallback;
* circuit breaker;
* custos;
* logs;
* UI de modelos.

Critérios:

* listar providers;
* testar conexão;
* listar modelos;
* selecionar perfil;
* executar requisição;
* fallback visível;
* instalar modelo local com confirmação;
* cancelar download.

---

## FASE 5 — ONBOARDING E SEGREDOS

Objetivo:

Permitir uma instalação real.

Entregas:

* onboarding;
* diagnóstico;
* keychain;
* configuração de modelos;
* OpenClaw;
* pasta de projeto;
* permissões;
* teste final.

Critérios:

* nenhum segredo no banco;
* onboarding retomável;
* diagnóstico real;
* configurações editáveis;
* desconexão limpa.

---

## FASE 6 — HOME, CHAT E ROSTO

Objetivo:

Criar a experiência principal.

Entregas:

* rosto original;
* estados;
* chat;
* streaming;
* anexos;
* status;
* projetos recentes;
* tarefas ativas;
* aprovações;
* erros.

Critérios:

* rosto reage a eventos;
* chat funciona;
* resposta em streaming;
* estado offline;
* estado de erro;
* acessibilidade;
* opção sem animação.

---

## FASE 7 — VOZ

Objetivo:

Conversa por voz de baixa latência.

Entregas:

* push-to-talk;
* STT ElevenLabs;
* TTS ElevenLabs;
* streaming;
* interrupção;
* lip sync;
* fallback textual;
* métricas;
* seleção de voz.

Critérios:

* transcrição parcial;
* resposta rápida;
* interrupção;
* reconexão;
* erro tratado;
* sem bloquear chat;
* custo registrado.

---

## FASE 8 — FILA PERSISTENTE

Objetivo:

Executar tarefas longas com confiabilidade.

Entregas:

* queue;
* workers;
* leases;
* retries;
* cancelamento;
* pausa;
* dead-letter;
* prioridade;
* dependências;
* recuperação.

Critérios:

* fechar sistema durante job;
* reabrir;
* recuperar corretamente;
* impedir duplicação;
* cancelar processo;
* detectar timeout;
* manter histórico.

---

## FASE 9 — PROJECT ENGINE

Objetivo:

Adicionar e entender projetos.

Entregas:

* seletor de pasta;
* detector de stack;
* Git;
* comandos;
* indexação;
* file watcher;
* saúde;
* tela do projeto.

Critérios:

* projeto Node detectado;
* projeto Python detectado;
* repositório com alterações não perdido;
* arquivos sensíveis bloqueados;
* índice atualizado.

---

## FASE 10 — WORKTREES E EXECUÇÃO SEGURA

Objetivo:

Isolar alterações dos agentes.

Entregas:

* criação;
* branch;
* lock;
* limpeza;
* diff;
* rollback;
* aprovação;
* integração.

Critérios:

* agente não edita main;
* duas tarefas isoladas;
* conflito detectado;
* worktree não removido com alterações;
* comandos perigosos bloqueados.

---

## FASE 11 — AGENTES E ORQUESTRAÇÃO

Objetivo:

Criar agentes reais.

Entregas:

* manifests;
* Concierge;
* Triage;
* Planner;
* Developer;
* Review;
* handoffs;
* budgets;
* limites;
* executores Claude/Codex.

Critérios:

* tarefa pequena usa fluxo curto;
* tarefa grande usa plano;
* handoff registrado;
* limite de rodadas;
* cancelamento;
* artefatos;
* revisão.

---

## FASE 12 — FLUXO VISUAL E FILA

Objetivo:

Mostrar o trabalho em tempo real.

Entregas:

* graph;
* timeline;
* fila;
* logs;
* ações;
* progresso;
* custos;
* filtros.

Critérios:

* animação baseada em evento real;
* replay;
* clique em agente;
* clique em handoff;
* erro visível;
* pausa;
* cancelamento.

---

## FASE 13 — CENTRAL PESSOAL

Objetivo:

Mostrar o que o usuário precisa fazer e o que ocorreu.

Entregas:

* tarefas pessoais;
* briefing diário;
* diário;
* lembretes;
* sugestões;
* fontes;
* confirmação de inferências.

Critérios:

* usuário pergunta “o que tenho para fazer?”;
* resposta usa banco;
* origem visível;
* inferência não confirmada é marcada;
* usuário corrige;
* usuário exclui.

---

## FASE 14 — GMAIL E CALENDAR

Objetivo:

Integrar comunicação e agenda.

Entregas:

* OAuth;
* permissões;
* leitura;
* sincronização;
* resumo;
* rascunho;
* envio aprovado;
* agenda;
* conflitos;
* eventos;
* Pub/Sub ou polling.

Critérios:

* conexão opcional;
* revogação;
* token expirado;
* escopos progressivos;
* envio bloqueado sem autorização;
* prompt injection testada;
* fuso horário correto.

---

## FASE 15 — WHATSAPP

Objetivo:

Usar o OpenClaw como canal.

Entregas:

* plugin;
* QR;
* status;
* contatos;
* grupos;
* resumo;
* respostas;
* comandos;
* aprovações;
* auditoria.

Critérios:

* contato não permitido bloqueado;
* grupo exige política;
* ação perigosa exige aprovação;
* envio registrado;
* desconexão limpa;
* sessão expirada tratada.

---

## FASE 16 — MEMÓRIA

Objetivo:

Criar continuidade segura.

Entregas:

* memória por escopo;
* memória de projeto;
* memória pessoal;
* fontes;
* busca;
* edição;
* exclusão;
* retenção;
* exportação.

Critérios:

* apagar funciona;
* projeto A não contamina B;
* perfil A não contamina B;
* origem visível;
* dado sensível não memorizado automaticamente.

---

## FASE 17 — OBSERVABILIDADE, CUSTOS E SEGURANÇA

Objetivo:

Consolidar controle.

Entregas:

* métricas;
* custos;
* logs;
* redaction;
* threat model final;
* kill switch;
* políticas;
* auditoria;
* alertas.

Critérios:

* nenhuma chave em logs;
* custo por projeto;
* fallback rastreado;
* kill switch encerra execução;
* recuperação não corrompe dados;
* testes de injeção.

---

## FASE 18 — EMPACOTAMENTO E RELEASE

Objetivo:

Gerar aplicação instalável.

Entregas:

* instalador Windows;
* ícone;
* tray;
* auto-start opcional;
* updater;
* assinatura;
* backup;
* restore;
* desinstalação;
* release notes.

Critérios:

* instalação limpa;
* atualização;
* desinstalação preserva dados quando solicitado;
* remoção total quando solicitado;
* restore funcional;
* sidecars encerrados.

---

## FASE 19 — HARDENING

Objetivo:

Preparar beta utilizável.

Entregas:

* testes E2E;
* testes de carga;
* fault injection;
* rate limits;
* processos órfãos;
* offline;
* provider indisponível;
* banco bloqueado;
* disco cheio;
* WSL parado;
* OpenClaw desconectado;
* OAuth expirado;
* microfone indisponível.

Critérios:

* nenhum erro causa tela branca;
* dados preservados;
* mensagens úteis;
* recovery documentado;
* suíte de regressão.

---

## FASE 20 — FUNCIONALIDADES AVANÇADAS

Somente depois do núcleo estável:

* wake word;
* múltiplas máquinas;
* sincronização;
* mobile companion;
* marketplace de plugins;
* criação visual de workflows;
* squads avançados;
* execução distribuída;
* navegador controlado;
* controle de desktop;
* Google Drive;
* Slack;
* Teams;
* agenda avançada;
* automações condicionais;
* API oficial do WhatsApp;
* múltiplos perfis;
* modo servidor;
* colaboração em equipe.

---

# 52. TESTES OBRIGATÓRIOS

## Unitários

* domínio;
* transições;
* queue;
* roteamento;
* custos;
* permissões;
* redaction;
* memória.

## Contrato

* OpenClaw;
* Ollama;
* Claude;
* Codex;
* ElevenLabs;
* Gmail;
* Calendar;
* WhatsApp.

## Integração

* tarefa completa;
* worktree;
* retry;
* aprovação;
* cancelamento;
* voice pipeline.

## E2E

1. instalar;
2. concluir onboarding;
3. conectar modelo;
4. conversar;
5. adicionar projeto;
6. criar tarefa;
7. aprovar plano;
8. executar;
9. testar;
10. revisar;
11. concluir;
12. consultar histórico.

## Segurança

* prompt injection em e-mail;
* prompt injection em WhatsApp;
* path traversal;
* command injection;
* plugin malicioso;
* segredo em log;
* arquivo `.env`;
* force push;
* exclusão;
* WebSocket não autenticado.

## Falhas

* internet cai;
* provider cai;
* Gateway cai;
* banco trava;
* disco enche;
* aplicação fecha;
* worker morre;
* processo filho trava;
* OAuth expira;
* modelo local não carrega.

---

# 53. CRITÉRIOS DE QUALIDADE

Não considerar uma fase concluída quando:

* existem botões falsos;
* existem dados mockados em produção;
* testes estão quebrados;
* lint está quebrado;
* tipos estão quebrados;
* migrations não foram testadas;
* logs contêm segredos;
* erros são engolidos;
* interface não mostra falha;
* cancelamento não encerra processo;
* documentação está desatualizada;
* uma decisão importante não tem ADR;
* comportamento não possui critério de aceite;
* função crítica não possui teste.

---

# 54. DEFINITION OF DONE

Uma tarefa só está concluída quando:

1. requisito implementado;
2. código tipado;
3. erro tratado;
4. logs estruturados;
5. evento emitido;
6. teste criado;
7. teste executado;
8. documentação atualizada;
9. segurança verificada;
10. interface apresenta estado real;
11. rollback avaliado;
12. critérios de aceite atendidos.

---

# 55. PADRÃO DE COMMITS

Usar commits pequenos e claros:

```text
feat(control-plane): add persistent event store
feat(openclaw): add gateway websocket adapter
feat(queue): implement job leases
feat(projects): add git worktree isolation
feat(voice): stream ElevenLabs TTS
fix(security): redact provider tokens from logs
test(queue): cover abandoned job recovery
docs(adr): document routing engine decision
```

Não criar um único commit com todo o sistema.

Criar branch:

```text
develop
```

E branches de fase:

```text
phase/00-upstream-audit
phase/01-foundation
phase/02-control-plane
```

---

# 56. COMPORTAMENTO DO AGENTE DE DESENVOLVIMENTO

Ao receber este prompt:

1. inspecione o diretório atual;
2. não apague arquivos existentes;
3. descubra se já existe repositório;
4. leia `README`, `AGENTS.md`, `CLAUDE.md` e arquivos equivalentes;
5. verifique ambiente;
6. crie diagnóstico;
7. realize a Fase 0;
8. documente decisões;
9. crie o monorepo;
10. implemente a Fase 1;
11. execute testes;
12. apresente relatório.

Não invente que comandos funcionaram.

Para cada comando executado, registre:

* comando;
* resultado;
* exit code;
* erro;
* correção.

Não instalar dependências globais sem necessidade e autorização.

Não alterar configurações do sistema operacional silenciosamente.

Não instalar WSL, Docker, Ollama, OpenClaw, Rust ou outros componentes sem mostrar o que será feito.

Se encontrar uma dúvida não bloqueante:

* escolha a alternativa tecnicamente mais segura;
* registre a suposição;
* crie ADR;
* continue.

Só interrompa para perguntar quando a decisão:

* puder causar perda de dados;
* exigir credencial;
* exigir pagamento;
* exigir instalação privilegiada;
* alterar infraestrutura existente;
* conceder acesso externo;
* definir identidade visual final;
* envolver escolha irreversível.

---

# 57. PRIMEIRA EXECUÇÃO ESPERADA

Comece produzindo:

```text
1. Diagnóstico do ambiente
2. Auditoria dos repositórios
3. Matriz build vs reuse
4. Arquitetura inicial
5. Threat model inicial
6. ADRs 001 a 004
7. Estrutura do monorepo
8. Aplicação Tauri mínima
9. Control Plane mínimo
10. SQLite e migrations
11. Event Bus
12. Health check
13. WebSocket interno
14. Tela de diagnóstico
15. Testes básicos
16. README de execução
```

A primeira entrega funcional deverá permitir:

```text
Abrir o aplicativo
→ iniciar o Control Plane
→ conectar ao WebSocket
→ verificar saúde
→ mostrar sistema operacional
→ mostrar hardware detectado
→ mostrar runtimes detectados
→ mostrar status do banco
→ mostrar eventos em tempo real
→ encerrar todos os processos corretamente
```

Ainda não conectar Gmail, Calendar ou WhatsApp na primeira entrega.

Primeiro construa uma fundação confiável.

---

# 58. RESULTADO FINAL ESPERADO

Ao final de todas as fases, o usuário deverá ser capaz de:

1. instalar o Ultron;
2. concluir onboarding;
3. criar uma identidade visual;
4. selecionar voz;
5. conversar por texto;
6. conversar por voz;
7. adicionar projetos;
8. solicitar desenvolvimento;
9. acompanhar planejamento;
10. aprovar execução;
11. ver agentes trabalhando;
12. ver tarefas na fila;
13. pausar e cancelar;
14. acompanhar custos;
15. usar modelos locais;
16. usar Claude;
17. usar Codex;
18. usar OpenAI;
19. conectar OpenClaw;
20. conectar Gmail;
21. conectar agenda;
22. conectar WhatsApp;
23. receber briefing diário;
24. consultar o que foi feito;
25. consultar erros;
26. consultar projetos;
27. editar e apagar memória;
28. controlar permissões;
29. interromper o sistema;
30. auditar todas as ações.

O objetivo não é criar apenas uma demonstração visual.

O objetivo é criar uma base real, extensível, segura e instalável para um assistente pessoal e profissional capaz de transformar conversas em trabalho estruturado e verificável.

Comece agora pela Fase 0 e avance para a Fase 1 após concluir e documentar a auditoria.
