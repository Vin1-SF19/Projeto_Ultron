# ADR-010 — Armazenamento de segredos: `@napi-rs/keyring`

## Status
Aceito

## Data
2026-07-29

## Contexto
A seção 7 do prompt mestre exige que segredos (API keys, tokens) nunca sejam armazenados em texto plano no SQLite — apenas uma referência (`secret_ref`) para o keychain nativo do SO (Windows Credential Manager, macOS Keychain, Linux Secret Service).

Duas bibliotecas Node foram avaliadas:
- **`keytar`** (7.9.0): historicamente a escolha padrão, mas **arquivada/sem manutenção** desde 2022 (projeto original mantido pela equipe do Atom/GitHub, descontinuado após o fim do Atom). Usa `prebuild-install` — mesma classe de risco que já causou falha real com `better-sqlite3` na Fase 1 (sem prebuild garantido para versões recentes do Node no Windows).
- **`@napi-rs/keyring`** (1.3.0): mantida ativamente, escrita em Rust via NAPI-RS, **zero dependências**, com binários prebuild publicados para `win32-x64-msvc`, `win32-arm64-msvc`, `win32-ia32-msvc`, além de macOS e Linux (glibc/musl). Confirmado via `npm view` que o pacote da plataforma correta (`@napi-rs/keyring-win32-x64-msvc@1.3.0`) existe e está publicado.

## Decisão
Usar **`@napi-rs/keyring`** como biblioteca de acesso ao keychain nativo do SO, encapsulada em um `SecretStore` próprio em `packages/security`.

## Alternativas consideradas
- **`keytar`:** rejeitado — sem manutenção ativa, risco de quebra em versões futuras do Node/Electron, mesma classe de risco de `prebuild-install` que já mordeu este projeto uma vez.
- **Implementação própria via `child_process` chamando `cmdkey`/PowerShell `CredentialManager` no Windows:** rejeitado — mais frágil, exigiria lógica separada por SO, e `@napi-rs/keyring` já abstrai isso de forma multiplataforma (necessário para Linux/macOS nas fases futuras, conforme prioridade de arquitetura da Fase 0).

## Consequências
- `packages/security` expõe uma interface `SecretStore` (`set`, `get`, `delete`) que abstrai a biblioteca concreta — se `@napi-rs/keyring` apresentar problemas no futuro, a troca fica isolada nesse pacote.
- O SQLite nunca armazena o valor do segredo — apenas um `secret_ref` (string opaca, ex: `ultron:provider:<id>`) que o `SecretStore` usa como chave para buscar o valor real no keychain do SO no momento do uso.
- Cada segredo é armazenado sob o serviço `"Ultron"` no Credential Manager do Windows, com a conta sendo o `secret_ref` — visível e gerenciável pelo usuário via o Gerenciador de Credenciais nativo do Windows, sem ferramenta proprietária adicional.
