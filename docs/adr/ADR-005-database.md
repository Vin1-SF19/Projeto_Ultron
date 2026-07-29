# ADR-005 — Driver SQLite: `node:sqlite` nativo em vez de `better-sqlite3`

## Status
Aceito

## Data
2026-07-29

## Contexto
Durante a implementação da Fase 1 (Control Plane mínimo), a tentativa de instalar `better-sqlite3` (dependência nativa, requer compilação C++ via node-gyp) falhou no ambiente de desenvolvimento (Windows 11, Node v24.16.0):

```text
gyp ERR! find VS You need to install the latest version of Visual Studio
gyp ERR! find VS including the "Desktop development with C++" workload.
gyp ERR! stack Error: Could not find any Visual Studio installation to use
```

Não há prebuilt binary publicado para `better-sqlite3` compatível com `target=24.16.0 runtime=node arch=x64 platform=win32` no momento desta implementação. Instalar o Visual Studio Build Tools ("Desktop development with C++") é uma operação pesada (múltiplos GB) e é exatamente o tipo de instalação privilegiada de componente de sistema que o prompt mestre (seção 56) exige confirmar explicitamente com o usuário antes de executar — não instalar silenciosamente.

Como alternativa, foi verificado que o Node.js 24.16.0 já inclui o módulo nativo `node:sqlite` (`DatabaseSync`), testado localmente com sucesso (`CREATE TABLE` executado sem erro), sem qualquer dependência de compilação nativa externa.

## Decisão
Usar **`node:sqlite`** (módulo nativo do Node.js, `node:sqlite`/`DatabaseSync`) como driver SQLite do `packages/database`, em vez de `better-sqlite3`.

## Alternativas consideradas
- **Instalar Visual Studio Build Tools para viabilizar `better-sqlite3`:** rejeitado por ora — é uma instalação privilegiada e pesada de componente de sistema, que exigiria confirmação explícita do usuário (seção 56 do prompt mestre) antes de prosseguir, e não é estritamente necessária dado que existe alternativa nativa funcional.
- **`@libsql/client` ou outro driver com prebuilds:** não avaliado em profundidade porque a alternativa nativa (`node:sqlite`) já resolve o problema sem adicionar nenhuma dependência de terceiros.
- **`node:sqlite` (escolhido):** zero dependências nativas de terceiros, mantido pelo próprio projeto Node.js, já confirmado funcional no ambiente exato de desenvolvimento. Trade-off: API ainda é considerada "experimental" pela documentação do Node (ainda que funcional e estável em testes locais); reavaliar quando a API se tornar estável/LTS, e revisitar `better-sqlite3` se o usuário decidir instalar as Build Tools no futuro (ex: para outras dependências nativas do projeto, como o próprio Tauri/Rust).

## Consequências
- `packages/database` depende apenas de `node:sqlite`, sem dependência npm externa para o driver.
- WAL, foreign keys e busy timeout continuam configurados via `PRAGMA`, API equivalente à usada com `better-sqlite3`.
- Caso o usuário opte, no futuro, por instalar as Visual Studio Build Tools (por exemplo, para compilar o lado Rust do Tauri, que também as exige), pode-se reavaliar a troca para `better-sqlite3` ou outro driver, mas isso não é necessário para a Fase 1.
- Esta decisão não afeta a stack Rust/Tauri do app desktop (Fase 1, item app Tauri), que tem seus próprios requisitos de toolchain, tratados separadamente.
