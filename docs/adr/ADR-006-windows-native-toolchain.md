# ADR-006 — Toolchain nativo no Windows: Rust + Visual Studio Build Tools

## Status
Aceito

## Data
2026-07-29

## Contexto
Durante a Fase 1, a criação do app desktop Tauri exigiu Rust/Cargo (não instalados no ambiente até então — ver diagnóstico inicial em [STATUS.md](../../STATUS.md)). Após instalar Rust via `rustup` (pacote `Rustlang.Rustup` via winget), a primeira tentativa de compilar um binário Rust simples falhou:

```text
error: linking with `link.exe` failed: exit code: 1
note: you may need to install Visual Studio build tools with the "C++ build tools" workload
```

O target oficialmente suportado pelo Tauri no Windows é `x86_64-pc-windows-msvc`, que depende do linker do MSVC (não do `link.exe` do Git for Windows, que estava sombreando o PATH mas não é o linker correto). Isso confirma a limitação já antecipada em [ADR-005](ADR-005-database.md) (a mesma classe de problema que afetou `better-sqlite3`).

## Decisão
Instalar o **Visual Studio Build Tools 2022** com o workload **"Desktop development with C++"** (`Microsoft.VisualStudio.Workload.VCTools`), via winget, com confirmação explícita do usuário antes da execução (conforme seção 56 do prompt mestre — instalação privilegiada de componente de sistema).

Comando executado:
```text
winget install --id Microsoft.VisualStudio.2022.BuildTools -e \
  --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

Resultado: instalação concluída com sucesso; `rustc` passou a compilar e linkar corretamente um binário de teste (`hello from rust` executado com sucesso).

## Alternativas consideradas
- **Não instalar e pausar a Fase 1 no app Tauri:** rejeitado pelo usuário, que optou explicitamente por prosseguir com a instalação quando perguntado.
- **Usar apenas `better-sqlite3` revertendo ADR-005, já que as Build Tools agora existem:** não adotado por ora — `node:sqlite` já está funcionando (ver ADR-005) e não há necessidade comprovada de reverter; revisitar apenas se surgir uma limitação concreta do `node:sqlite` experimental.
- **Usar GNU toolchain (`x86_64-pc-windows-gnu`) para evitar MSVC:** não avaliado — o Tauri recomenda MSVC como target primário e mais bem suportado no Windows; trocar de toolchain introduziria uma divergência não documentada pelo próprio Tauri sem necessidade comprovada.

## Consequências
- O ambiente de desenvolvimento agora tem o toolchain completo necessário para compilar tanto o Control Plane (Node/TypeScript) quanto o app Desktop (Tauri/Rust).
- Instalação registrada e reprodutível via winget — qualquer nova máquina de desenvolvimento deve seguir o mesmo caminho (documentar em `docs/development/SETUP_WINDOWS.md` em fase posterior).
- Esta é uma dependência de **desenvolvimento/build**, não uma dependência de runtime do produto final instalado pelo usuário comum — o instalador final do Ultron (Fase 18, empacotamento) já entrega o binário compilado, sem exigir Rust/MSVC na máquina do usuário final.
