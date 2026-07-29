# Contribuindo com o Projeto Ultron

## Fluxo de desenvolvimento

O projeto é desenvolvido em fases sequenciais (ver [docs/product/ROADMAP.md](docs/product/ROADMAP.md)). Não pule fases sem justificativa registrada em ADR.

## Branches

- `develop` — branch principal de integração.
- `phase/NN-nome-da-fase` — branch de trabalho por fase (ex: `phase/01-foundation`).
- `ultron/task-<task-id>-<slug>` — branches criadas automaticamente por agentes, sempre em git worktree isolado (nunca editam `develop`/`main` diretamente).

## Commits

Commits pequenos e claros, no formato:

```text
feat(control-plane): add persistent event store
fix(security): redact provider tokens from logs
test(queue): cover abandoned job recovery
docs(adr): document routing engine decision
```

Não criar um único commit com todo o sistema.

## Definition of Done

Uma tarefa só está concluída quando:

1. requisito implementado;
2. código tipado;
3. erro tratado;
4. logs estruturados;
5. evento emitido (quando aplicável);
6. teste criado;
7. teste executado;
8. documentação atualizada;
9. segurança verificada;
10. interface apresenta estado real (nunca dado mockado em produção);
11. rollback avaliado;
12. critérios de aceite da fase atendidos.

Ver seção 54 do [prompt_Inicial.md](prompt_Inicial.md) para o texto completo.

## Qualidade

Uma fase não é considerada concluída quando:

- existem botões falsos ou dados mockados em produção;
- testes ou lint estão quebrados;
- migrations não foram testadas;
- logs contêm segredos;
- erros são engolidos;
- uma decisão importante não tem ADR correspondente.
