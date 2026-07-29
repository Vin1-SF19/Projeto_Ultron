import { useCallback, useState } from 'react';
import { Face } from '../face/Face.js';
import type { FaceState } from '../face/face-state.js';
import { faceStateForEvent } from '../face/event-to-face-state.js';
import { ChatPanel } from '../chat/ChatPanel.js';
import { ProjectsPanel } from '../ProjectsPanel.js';
import './home.css';

const NAV_ITEMS = [
  'Home',
  'Projetos',
  'Tarefas',
  'Agentes',
  'Modelos',
  'Integrações',
  'Memória',
  'Logs',
  'Configurações',
] as const;

export function Home() {
  const [faceState, setFaceState] = useState<FaceState>('idle');
  const [animationIntensity, setAnimationIntensity] = useState<'full' | 'reduced' | 'none'>('full');
  const [faceHidden, setFaceHidden] = useState(false);

  const handleFaceEvent = useCallback((eventType: string) => {
    const nextState = faceStateForEvent(eventType);
    if (nextState) setFaceState(nextState);
  }, []);

  return (
    <div className="home-layout">
      <nav className="home-nav" aria-label="Navegação principal">
        <div className="home-nav__brand">Ultron</div>
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item} className={item === 'Home' ? 'home-nav__item home-nav__item--active' : 'home-nav__item'}>
              {item}
            </li>
          ))}
        </ul>
      </nav>

      <main className="home-center">
        <div className="home-center__face-area">
          <Face state={faceState} animationIntensity={animationIntensity} hidden={faceHidden} />
          <div className="home-center__face-controls">
            <label>
              <input
                type="checkbox"
                checked={faceHidden}
                onChange={(e) => setFaceHidden(e.target.checked)}
              />
              Ocultar rosto
            </label>
            <label>
              Animação:
              <select
                value={animationIntensity}
                onChange={(e) => setAnimationIntensity(e.target.value as typeof animationIntensity)}
              >
                <option value="full">Completa</option>
                <option value="reduced">Reduzida</option>
                <option value="none">Nenhuma</option>
              </select>
            </label>
          </div>
        </div>

        <div className="home-center__chat">
          <ChatPanel onFaceEvent={handleFaceEvent} />
        </div>
      </main>

      <aside className="home-side" aria-label="Seu dia">
        <h2>Seu dia</h2>
        <p className="home-side__placeholder">
          Agenda, pendências, aprovações e mensagens ainda não estão conectadas a nenhuma fonte real. Esta seção será
          preenchida quando as integrações correspondentes existirem — nunca com dados de exemplo.
        </p>

        <h2>Projetos</h2>
        <ProjectsPanel />
      </aside>
    </div>
  );
}
