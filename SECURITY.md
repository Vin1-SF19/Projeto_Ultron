# Segurança — Projeto Ultron

Ver o threat model completo em [docs/security/THREAT_MODEL.md](docs/security/THREAT_MODEL.md).

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

## Reportando uma vulnerabilidade

Este é um projeto em desenvolvimento inicial (Fase 0/1). Até que existam canais públicos de report, registre a vulnerabilidade encontrada como uma issue detalhada no repositório, marcada com o máximo de contexto técnico possível (sem incluir segredos reais).

## Regras não-negociáveis

- Nenhum segredo (API key, token, senha, cookie, chave privada) é armazenado em texto plano no banco de dados — apenas `secret_ref` apontando para o keychain nativo do sistema operacional.
- Nenhuma ação classificada como perigosa (exclusão, comandos privilegiados, force push, envio de mensagens/e-mails, instalação de dependências) é executada sem passar pelo Approval Engine.
- Conteúdo externo (e-mail, WhatsApp, páginas web, arquivos de projetos de terceiros) é sempre tratado como entrada não confiável, nunca como comando com autoridade automática sobre o sistema.
- Logs nunca incluem segredos — redaction centralizada é obrigatória.
