import { useEffect, useRef, useState } from 'react';
import type { FaceState } from './face-state.js';
import './face.css';

export interface FaceProps {
  state: FaceState;
  /** Reduz/desliga animação — respeita prefers-reduced-motion por padrão, mas o usuário pode forçar. */
  animationIntensity?: 'full' | 'reduced' | 'none';
  hidden?: boolean;
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

/**
 * Rosto original do Ultron, em SVG 2D (seção 24 do prompt mestre). Núcleo
 * central ecoa o ícone oficial (docs/product/brand). Sem libs externas —
 * animação via CSS classes por estado, para nunca bloquear o texto da
 * resposta enquanto a animação "carrega" (ela não carrega nada).
 */
export function Face({ state, animationIntensity = 'full', hidden = false }: FaceProps) {
  const [blinking, setBlinking] = useState(false);
  const blinkTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (animationIntensity === 'none') return;
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
  }, [state, animationIntensity]);

  if (hidden) {
    return null;
  }

  return (
    <div
      className={`ultron-face ultron-face--${state} ultron-face--anim-${animationIntensity}`}
      role="img"
      aria-label={`Rosto do Ultron: ${STATE_LABELS[state]}`}
    >
      <svg viewBox="0 0 200 200" className="ultron-face__svg">
        <circle className="ultron-face__ring ultron-face__ring--outer" cx="100" cy="100" r="92" />
        <circle className="ultron-face__ring ultron-face__ring--inner" cx="100" cy="100" r="78" />

        <g className="ultron-face__eyes">
          <ellipse
            className={`ultron-face__eye ultron-face__eye--left${blinking ? ' ultron-face__eye--blink' : ''}`}
            cx="72"
            cy="95"
            rx="12"
            ry="16"
          />
          <ellipse
            className={`ultron-face__eye ultron-face__eye--right${blinking ? ' ultron-face__eye--blink' : ''}`}
            cx="128"
            cy="95"
            rx="12"
            ry="16"
          />
        </g>

        <path className="ultron-face__mouth" d="M 78 128 Q 100 128 122 128" />

        <circle className="ultron-face__core" cx="100" cy="100" r="10" />
      </svg>

      <span className="ultron-face__sr-only">{STATE_LABELS[state]}</span>
    </div>
  );
}
