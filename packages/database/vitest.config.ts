import { builtinModules } from 'node:module';
import { defineConfig } from 'vitest/config';

// Vite 5.4.x resolve módulos "node:*" contra sua própria lista estática de builtins,
// que por sua vez deriva de node:module.builtinModules — mas "sqlite" é um builtin
// experimental do Node 22+ que NÃO aparece em builtinModules (só é detectável via
// isBuiltin('node:sqlite') === true). Por isso o Vite tenta resolvê-lo como pacote
// npm "sqlite" e falha. Declaramos explicitamente como externo.
const nodeBuiltins = [...builtinModules.flatMap((name) => [name, `node:${name}`]), 'node:sqlite'];

export default defineConfig({
  build: {
    rollupOptions: {
      external: nodeBuiltins,
    },
  },
  test: {
    environment: 'node',
    pool: 'forks',
  },
});
