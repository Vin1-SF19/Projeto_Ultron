import { useEffect, useState } from 'react';
import {
  fetchHealth,
  fetchOnboardingProgress,
  fetchSystemCapabilities,
  fetchSystemStatus,
  type SystemCapabilities,
  type SystemStatus,
} from './control-plane-client.js';
import { ProjectsPanel } from './ProjectsPanel.js';
import { Onboarding } from './Onboarding.js';

type ConnectionState = 'loading' | 'connected' | 'error';

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function App() {
  const [state, setState] = useState<ConnectionState>('loading');
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [capabilities, setCapabilities] = useState<SystemCapabilities | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await fetchHealth();
        const [systemStatus, systemCapabilities, onboarding] = await Promise.all([
          fetchSystemStatus(),
          fetchSystemCapabilities(),
          fetchOnboardingProgress(),
        ]);
        if (cancelled) return;
        setStatus(systemStatus);
        setCapabilities(systemCapabilities);
        setOnboardingDone(onboarding.currentStep === 'done');
        setState('connected');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setState('error');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'connected' && onboardingDone === false) {
    return <Onboarding onFinished={() => setOnboardingDone(true)} />;
  }

  return (
    <div className="status-page">
      <h1>Ultron — Diagnóstico</h1>

      <div className="status-card">
        <div className="status-row">
          <span>Control Plane</span>
          {state === 'loading' && <span className="badge badge-loading">verificando…</span>}
          {state === 'connected' && <span className="badge badge-ok">conectado</span>}
          {state === 'error' && <span className="badge badge-error">desconectado</span>}
        </div>

        {state === 'error' && (
          <div className="status-row">
            <span>Não disponível nesta versão sem o Control Plane em execução.</span>
            <span>{error}</span>
          </div>
        )}

        {status && (
          <>
            <div className="status-row">
              <span>Versão</span>
              <span>{status.version}</span>
            </div>
            <div className="status-row">
              <span>Iniciado em</span>
              <span>{new Date(status.startedAt).toLocaleString('pt-BR')}</span>
            </div>
            <div className="status-row">
              <span>Uptime</span>
              <span>{Math.round(status.uptimeSeconds)}s</span>
            </div>
            <div className="status-row">
              <span>Banco de dados</span>
              <span>{status.database.filePath}</span>
            </div>
          </>
        )}
      </div>

      {capabilities && (
        <div className="status-card">
          <div className="status-row">
            <span>Sistema operacional</span>
            <span>
              {capabilities.environment.platform} ({capabilities.environment.osRelease})
            </span>
          </div>
          <div className="status-row">
            <span>CPU</span>
            <span>
              {capabilities.environment.cpuModel} ({capabilities.environment.cpuCores} núcleos)
            </span>
          </div>
          <div className="status-row">
            <span>Memória</span>
            <span>
              {formatBytes(capabilities.environment.freeMemoryBytes)} livre de{' '}
              {formatBytes(capabilities.environment.totalMemoryBytes)}
            </span>
          </div>
          <div className="status-row">
            <span>Node.js</span>
            <span>{capabilities.environment.nodeVersion}</span>
          </div>
        </div>
      )}

      {state === 'connected' && <ProjectsPanel />}
    </div>
  );
}
