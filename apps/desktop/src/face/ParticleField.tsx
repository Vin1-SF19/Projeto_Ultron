import { useEffect, useRef } from 'react';
import type { FaceState } from './face-state.js';

export interface ParticleFieldProps {
  state: FaceState;
  reducedMotion: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hueShift: number;
  drift: number;
}

const STATE_ACCENT: Record<FaceState, string> = {
  idle: '58, 167, 255',
  listening: '58, 167, 255',
  hearing: '58, 167, 255',
  thinking: '138, 92, 246',
  speaking: '58, 167, 255',
  working: '245, 166, 35',
  success: '53, 199, 110',
  warning: '245, 166, 35',
  error: '229, 72, 77',
  offline: '74, 85, 104',
  sleeping: '45, 63, 82',
  privacy: '138, 92, 246',
  awaiting_approval: '245, 197, 66',
  interrupted: '229, 72, 77',
};

const PARTICLE_COUNT = 46;

/**
 * Campo de partículas vivo atrás do rosto — não decorativo aleatório: a cor
 * segue o accent do estado atual (mesma paleta do glow da máscara) e a
 * velocidade média sobe nos estados de atividade real (thinking/working/
 * speaking), caindo nos estados de repouso (sleeping/offline).
 */
export function ParticleField({ state, reducedMotion }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;

    function resize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    resize();

    if (particlesRef.current.length === 0) {
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        radius: 1 + Math.random() * 2.2,
        hueShift: Math.random(),
        drift: Math.random() * Math.PI * 2,
      }));
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    if (reducedMotion) {
      // Um único frame estático — nenhuma partícula em movimento contínuo.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const [r, g, b] = STATE_ACCENT[stateRef.current].split(',').map((n) => n.trim());
      for (const p of particlesRef.current) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.35)`;
        ctx.fill();
      }
      return () => resizeObserver.disconnect();
    }

    let raf = 0;
    const speedMultiplier: Record<FaceState, number> = {
      idle: 1,
      listening: 1.2,
      hearing: 1.3,
      thinking: 2.2,
      speaking: 1.8,
      working: 2.6,
      success: 1.4,
      warning: 1.5,
      error: 1.6,
      offline: 0.2,
      sleeping: 0.15,
      privacy: 0.6,
      awaiting_approval: 1.3,
      interrupted: 0.8,
    };

    function frame() {
      const canvas = canvasRef.current;
      if (!canvas || !ctx) return;
      const currentState = stateRef.current;
      const [r, g, b] = STATE_ACCENT[currentState].split(',').map((n) => n.trim());
      const mult = speedMultiplier[currentState];

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      for (const p of particlesRef.current) {
        p.drift += 0.004 * mult;
        p.x += (p.vx + Math.sin(p.drift) * 0.12) * mult;
        p.y += (p.vy + Math.cos(p.drift) * 0.12) * mult;

        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        const alpha = 0.2 + 0.25 * Math.sin(p.drift * 2 + p.hueShift * 10) * 0.5 + 0.15;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(0.08, alpha)})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
    };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} className="ultron-particles" aria-hidden="true" />;
}
