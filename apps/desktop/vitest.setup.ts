// jsdom não implementa matchMedia — polyfill mínimo para componentes que
// consultam prefers-reduced-motion. Testes que precisam de um valor
// específico usam vi.stubGlobal('matchMedia', ...) para sobrescrever.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
