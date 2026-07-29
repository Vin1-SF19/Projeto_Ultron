import { useEffect, useRef, useState } from 'react';
import type { FaceState } from './face-state.js';
import { ParticleField } from './ParticleField.js';
import './face.css';

export interface FaceProps {
  state: FaceState;
  /** Amplitude de fala normalizada (0-1), vinda do LipSyncDriver — abre a boca proporcionalmente. */
  mouthOpenness?: number;
}

const STATE_LABELS: Record<FaceState, string> = {
  idle: 'Em espera',
  listening: 'Ouvindo',
  hearing: 'Reconhecendo fala',
  thinking: 'Pensando',
  speaking: 'Falando',
  working: 'Trabalhando',
  success: 'Concluído com sucesso',
  warning: 'Atenção',
  error: 'Erro',
  offline: 'Desconectado',
  sleeping: 'Em repouso',
  privacy: 'Modo privado',
  awaiting_approval: 'Aguardando sua aprovação',
  interrupted: 'Interrompido',
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);
  return reduced;
}

/**
 * Rosto original do Ultron — máscara vetorial baseada no ícone oficial
 * (docs/product/brand/icon-original.png, criado pelo usuário): silhueta em
 * "U", olhos triangulares, núcleo de energia com circuitos, acentos
 * vermelhos. Sempre visível e sempre em animação completa (decisão do
 * usuário) — a única concessão de movimento é prefers-reduced-motion do
 * sistema operacional, por acessibilidade real, não uma opção manual.
 */
export function Face({ state, mouthOpenness = 0 }: FaceProps) {
  const [blinking, setBlinking] = useState(false);
  const blinkTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    if (state === 'sleeping' || state === 'offline') return;

    function scheduleBlink() {
      const delay = 2500 + Math.random() * 3500;
      blinkTimeout.current = setTimeout(() => {
        setBlinking(true);
        setTimeout(() => setBlinking(false), 140);
        scheduleBlink();
      }, delay);
    }
    scheduleBlink();
    return () => clearTimeout(blinkTimeout.current);
  }, [state, reducedMotion]);

  return (
    <div
      className={`ultron-face ultron-face--${state}${reducedMotion ? ' ultron-face--reduced-motion' : ''}`}
      role="img"
      aria-label={`Rosto do Ultron: ${STATE_LABELS[state]}`}
    >
      <ParticleField state={state} reducedMotion={reducedMotion} />

      <svg viewBox="0 0 480 480" className="ultron-face__svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="ultron-core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--face-core-bright)" stopOpacity="1" />
            <stop offset="55%" stopColor="var(--face-accent)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--face-accent)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ultron-metal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#333d4a" />
            <stop offset="100%" stopColor="#14181f" />
          </linearGradient>
        </defs>

        {/* Núcleo de energia isolado no topo, conectado por circuitos — nunca sobrepõe os olhos */}
        <g className="ultron-face__circuits">
          <path d="M240 30 V64 M240 64 L205 88 M240 64 L275 88 M205 88 L178 74 M275 88 L302 74" />
          <circle cx="178" cy="74" r="5" className="ultron-face__node" />
          <circle cx="302" cy="74" r="5" className="ultron-face__node" />
        </g>
        <circle className="ultron-face__core-halo" cx="240" cy="95" r="50" fill="url(#ultron-core-glow)" />
        <circle className="ultron-face__core-ring" cx="240" cy="95" r="30" />
        <circle className="ultron-face__core" cx="240" cy="95" r="12" />

        {/* Silhueta larga da máscara — dois "chifres"/orelhas laterais e queixo em V, como na referência */}
        <path
          className="ultron-face__mask"
          fill="url(#ultron-metal)"
          d="M240 160
             C 205 160 180 175 180 205
             L 180 260
             C 132 258 96 236 96 190
             L 96 165
             C 96 150 104 142 114 142
             C 124 142 130 150 130 163
             L 130 195
             C 130 212 142 222 160 226
             L 160 205
             C 160 165 195 138 240 138
             C 285 138 320 165 320 205
             L 320 226
             C 338 222 350 212 350 195
             L 350 163
             C 350 150 356 142 366 142
             C 376 142 384 150 384 165
             L 384 190
             C 384 236 348 258 300 260
             L 300 205
             C 300 175 275 160 240 160
             Z
             M 180 260
             L 180 300
             C 180 340 200 372 240 400
             C 280 372 300 340 300 300
             L 300 260
             C 300 285 285 300 265 305
             L 265 240
             C 265 225 254 216 240 216
             C 226 216 215 225 215 240
             L 215 305
             C 195 300 180 285 180 260
             Z"
        />

        {/* Acentos vermelhos: bordas externas das "orelhas" e queixo */}
        <path className="ultron-face__accent-left" d="M114 150 L114 190 C114 205 122 214 132 218" />
        <path className="ultron-face__accent-right" d="M366 150 L366 190 C366 205 358 214 348 218" />
        <path className="ultron-face__chin-accent" d="M212 360 L240 392 L268 360" />

        {/* Olhos triangulares — bem separados, na faixa central da máscara */}
        <g className={`ultron-face__eyes${blinking ? ' ultron-face__eyes--blink' : ''}`}>
          <path className="ultron-face__eye ultron-face__eye--left" d="M195 250 L232 264 L197 280 Z" />
          <path className="ultron-face__eye ultron-face__eye--right" d="M285 250 L248 264 L283 280 Z" />
        </g>

        {/* Boca — abertura controlada por mouthOpenness (lip sync por amplitude, seção 25) */}
        <ellipse
          className="ultron-face__mouth"
          cx="240"
          cy="315"
          rx="26"
          ry={2 + mouthOpenness * 16}
        />
      </svg>

      <span className="ultron-face__sr-only">{STATE_LABELS[state]}</span>
    </div>
  );
}
