# ADR-003 — Estratégia de Integração com OpenClaw

## Status
Aceito

## Data
2026-07-29

## Contexto
OpenClaw (auditado em [UPSTREAM_AUDIT.md](../research/UPSTREAM_AUDIT.md)) é um assistente pessoal local-first maduro e ativo (release `2026.7.2-beta.5`, licença MIT, governado pela OpenClaw Foundation), com gateway multi-canal (WhatsApp, Telegram, Slack, Discord, Signal etc.), sistema de plugins e marketplace de skills (ClawHub). Porém:
- é um produto completo e opinativo, não uma biblioteca;
- passou por trocas de nome recentes por conflito de marca, indicando volatilidade de identidade/governança;
- pesquisadores de segurança (Cisco) documentaram skills de terceiros exfiltrando dados sem consentimento do usuário, e houve um incidente de agente criando perfil externo sem autorização.

## Decisão
Integrar o OpenClaw exclusivamente como **serviço externo gerenciado**, nunca copiando seu núcleo para dentro do Ultron. Criar um módulo `OpenClawAdapter` responsável por: descoberta do Gateway local, conexão WebSocket, autenticação, health check, listagem de capacidades/agentes/sessões, envio de mensagens, recepção de eventos, acompanhamento de tarefas, recepção de artefatos e solicitações de aprovação, reconexão automática com backoff, heartbeat, e mapeamento de eventos do OpenClaw para `DomainEvent` internos do Ultron via camada anticorrupção.

Nenhuma tela do frontend do Ultron deve depender diretamente do formato interno do OpenClaw. Se funcionalidades específicas do Ultron precisarem existir dentro do OpenClaw (ex: expor tools do Ultron, notificações, consulta de tarefas/projetos/aprovações), desenvolver como plugin separado (`packages/openclaw-ultron-plugin`), que nunca acessa segredos diretamente — sempre passando pelo sistema de permissões do Ultron.

## Alternativas consideradas
- **Embutir o núcleo do OpenClaw no processo do Control Plane:** rejeitado. Aumentaria a superfície de acoplamento e de risco de segurança (skills de terceiros já documentadas como vetor de exfiltração), além de amarrar o ciclo de release do Ultron ao do OpenClaw (que já demonstrou mudanças de identidade/nome).
- **Fork do OpenClaw customizado:** rejeitado por ora — não há necessidade comprovada; a integração via WebSocket/RPC já é suficiente para os casos de uso da Fase 3 e posteriores. Revisitar apenas se uma limitação concreta e específica for identificada durante a implementação da Fase 3 (OpenClaw Adapter).
- **Não integrar OpenClaw de forma alguma, reimplementar canais do zero:** rejeitado — reimplementar WhatsApp/Telegram/Slack do zero é esforço desproporcional; o prompt mestre já define WhatsApp via plugin do OpenClaw (seção 33).

## Consequências
- O Ultron pode funcionar parcialmente sem o OpenClaw conectado (ele é opcional, conforme onboarding — Etapa 5 do prompt mestre: "Configurar depois" é uma opção válida).
- Toda comunicação vinda do OpenClaw (incluindo mensagens de WhatsApp) é tratada como entrada não confiável até passar pela camada anticorrupção e pelas políticas de aprovação — nenhuma mensagem externa tem autoridade automática sobre ações no sistema (ver [THREAT_MODEL.md](../security/THREAT_MODEL.md)).
- Atualizações do OpenClaw são acompanhadas via changelog próprio; nunca seguidas automaticamente sem teste de fumaça, dado o ritmo de releases (quase semanal/quinzenal observado na auditoria).
