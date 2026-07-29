import { useEffect, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import {
  advanceOnboarding,
  addProject,
  fetchOnboardingProgress,
  fetchOpenClawStatus,
  fetchProviders,
  fetchSystemCapabilities,
  putAutonomyLevel,
  resetOnboarding,
  type AutonomyLevel,
  type EnvironmentSnapshot,
  type OnboardingProgress,
  type OnboardingStep,
  type OpenClawStatus,
  type Provider,
} from './control-plane-client.js';

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'diagnostics',
  'assistant',
  'models',
  'openclaw',
  'projects',
  'integrations',
  'security',
  'test',
  'done',
];

const STEP_LABELS: Record<OnboardingStep, string> = {
  welcome: 'Boas-vindas',
  diagnostics: 'Diagnóstico',
  assistant: 'Assistente',
  models: 'Modelos',
  openclaw: 'OpenClaw',
  projects: 'Projetos',
  integrations: 'Integrações',
  security: 'Segurança',
  test: 'Teste',
  done: 'Concluído',
};

interface OnboardingProps {
  onFinished: () => void;
}

export function Onboarding({ onFinished }: OnboardingProps) {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOnboardingProgress()
      .then((p) => {
        setProgress(p);
        if (p.currentStep === 'done') onFinished();
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, [onFinished]);

  async function goToNextStep(current: OnboardingStep) {
    const index = STEP_ORDER.indexOf(current);
    const next = STEP_ORDER[index + 1] ?? 'done';
    try {
      const updated = await advanceOnboarding(current, next);
      setProgress(updated);
      if (next === 'done') onFinished();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (error) {
    return (
      <div className="status-page">
        <div className="status-card">
          <span className="badge badge-error">erro</span>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="status-page">
        <p>Carregando onboarding…</p>
      </div>
    );
  }

  return (
    <div className="status-page">
      <h1>Configuração inicial do Ultron</h1>

      <div className="status-row" role="navigation" aria-label="Progresso do onboarding">
        {STEP_ORDER.filter((s) => s !== 'done').map((step) => (
          <span
            key={step}
            className={`badge ${
              progress.completedSteps.includes(step)
                ? 'badge-ok'
                : step === progress.currentStep
                  ? 'badge-loading'
                  : ''
            }`}
            style={{ marginRight: 6 }}
          >
            {STEP_LABELS[step]}
          </span>
        ))}
      </div>

      <div className="status-card">
        <StepContent step={progress.currentStep} onNext={() => void goToNextStep(progress.currentStep)} />
      </div>

      <div className="status-row">
        <button
          onClick={() => {
            void resetOnboarding().then(setProgress);
          }}
        >
          Recomeçar onboarding
        </button>
      </div>
    </div>
  );
}

function StepContent({ step, onNext }: { step: OnboardingStep; onNext: () => void }) {
  switch (step) {
    case 'welcome':
      return <WelcomeStep onNext={onNext} />;
    case 'diagnostics':
      return <DiagnosticsStep onNext={onNext} />;
    case 'assistant':
      return <AssistantStep onNext={onNext} />;
    case 'models':
      return <ModelsStep onNext={onNext} />;
    case 'openclaw':
      return <OpenClawStep onNext={onNext} />;
    case 'projects':
      return <ProjectsStep onNext={onNext} />;
    case 'integrations':
      return <IntegrationsStep onNext={onNext} />;
    case 'security':
      return <SecurityStep onNext={onNext} />;
    case 'test':
      return <TestStep onNext={onNext} />;
    default:
      return null;
  }
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <>
      <h2>Bem-vindo</h2>
      <p>O Ultron é local-first: seus dados e projetos ficam na sua máquina.</p>
      <ul>
        <li>Todas as integrações externas (OpenClaw, Gmail, WhatsApp, providers pagos) são opcionais.</li>
        <li>Ações potencialmente perigosas exigem sua aprovação explícita.</li>
        <li>Automação tem limites que você configura — nada roda sem controle.</li>
      </ul>
      <button onClick={onNext}>Começar</button>
    </>
  );
}

function DiagnosticsStep({ onNext }: { onNext: () => void }) {
  const [env, setEnv] = useState<EnvironmentSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSystemCapabilities()
      .then((c) => setEnv(c.environment))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  return (
    <>
      <h2>Diagnóstico do ambiente</h2>
      {error && <p className="badge badge-error">{error}</p>}
      {env && (
        <>
          <div className="status-row">
            <span>Sistema operacional</span>
            <span>
              {env.platform} ({env.osRelease})
            </span>
          </div>
          <div className="status-row">
            <span>CPU</span>
            <span>
              {env.cpuModel} ({env.cpuCores} núcleos)
            </span>
          </div>
          <div className="status-row">
            <span>Node.js</span>
            <span>{env.nodeVersion}</span>
          </div>
        </>
      )}
      <button onClick={onNext} disabled={!env}>
        Continuar
      </button>
    </>
  );
}

function AssistantStep({ onNext }: { onNext: () => void }) {
  return (
    <>
      <h2>Assistente</h2>
      <p>
        Nome, voz, aparência e animação do assistente serão configuráveis quando o sistema de rosto/voz existir
        (fases futuras). Por ora, seguimos com os padrões.
      </p>
      <button onClick={onNext}>Continuar</button>
    </>
  );
}

function ModelsStep({ onNext }: { onNext: () => void }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    try {
      const { providers } = await fetchProviders();
      setProviders(providers);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <>
      <h2>Modelos</h2>
      <p>Providers configurados:</p>
      {error && <p className="badge badge-error">{error}</p>}
      {providers.map((p) => (
        <div className="status-row" key={p.id}>
          <span>{p.name}</span>
          <span className="badge badge-ok">{p.kind}</span>
        </div>
      ))}
      <p>
        Para conectar um provider pago (OpenAI, Anthropic) ou outro endpoint compatível, use a tela de
        Configurações após o onboarding — requer sua API key, nunca solicitada aqui automaticamente.
      </p>
      <button onClick={onNext}>Continuar</button>
    </>
  );
}

function OpenClawStep({ onNext }: { onNext: () => void }) {
  const [status, setStatus] = useState<OpenClawStatus | null>(null);

  useEffect(() => {
    fetchOpenClawStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  return (
    <>
      <h2>OpenClaw</h2>
      <div className="status-row">
        <span>Status</span>
        <span className={`badge ${status?.state === 'connected' ? 'badge-ok' : 'badge-loading'}`}>
          {status?.state ?? 'verificando…'}
        </span>
      </div>
      {status?.note && <p>{status.note}</p>}
      <p>
        Para conectar um Gateway OpenClaw, defina <code>OPENCLAW_GATEWAY_URL</code> e{' '}
        <code>OPENCLAW_GATEWAY_TOKEN</code> nas variáveis de ambiente do Control Plane, ou configure depois.
      </p>
      <button onClick={onNext}>{status?.state === 'connected' ? 'Continuar' : 'Configurar depois'}</button>
    </>
  );
}

function ProjectsStep({ onNext }: { onNext: () => void }) {
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setError(null);
    const selected = await open({ directory: true, multiple: false, title: 'Selecionar pasta do projeto' });
    if (!selected || Array.isArray(selected)) return;
    try {
      await addProject({ path: selected });
      setAdded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <h2>Primeiro projeto</h2>
      <p>Adicione a pasta de um projeto para o Ultron conhecer (opcional nesta etapa).</p>
      {error && <p className="badge badge-error">{error}</p>}
      {added && <p className="badge badge-ok">Projeto adicionado</p>}
      <button onClick={() => void handleAdd()}>Selecionar pasta</button>
      <button onClick={onNext}>{added ? 'Continuar' : 'Pular por agora'}</button>
    </>
  );
}

function IntegrationsStep({ onNext }: { onNext: () => void }) {
  return (
    <>
      <h2>Integrações</h2>
      <p>Gmail, Google Calendar e WhatsApp são todas opcionais e ainda não implementadas nesta versão.</p>
      <button onClick={onNext}>Continuar</button>
    </>
  );
}

function SecurityStep({ onNext }: { onNext: () => void }) {
  const [level, setLevel] = useState<AutonomyLevel>('observation');
  const [saving, setSaving] = useState(false);

  const LEVELS: { value: AutonomyLevel; label: string; description: string }[] = [
    { value: 'observation', label: 'Observação', description: 'Só lê e recomenda. Não altera nada.' },
    { value: 'assistance', label: 'Assistência', description: 'Cria planos/rascunhos. Exige aprovação para executar.' },
    { value: 'controlled_execution', label: 'Execução controlada', description: 'Executa ações previamente autorizadas.' },
    { value: 'bounded_autonomy', label: 'Autonomia delimitada', description: 'Executa regras explícitas com escopo/orçamento.' },
  ];

  async function handleContinue() {
    setSaving(true);
    try {
      await putAutonomyLevel(level);
    } finally {
      setSaving(false);
      onNext();
    }
  }

  return (
    <>
      <h2>Modo de autonomia</h2>
      {LEVELS.map((l) => (
        <label key={l.value} className="status-row" style={{ cursor: 'pointer' }}>
          <span>
            <input
              type="radio"
              name="autonomy"
              checked={level === l.value}
              onChange={() => setLevel(l.value)}
            />{' '}
            {l.label}
          </span>
          <span>{l.description}</span>
        </label>
      ))}
      <button onClick={() => void handleContinue()} disabled={saving}>
        {saving ? 'Salvando…' : 'Continuar'}
      </button>
    </>
  );
}

function TestStep({ onNext }: { onNext: () => void }) {
  return (
    <>
      <h2>Teste final</h2>
      <p>
        Chat e modelos já podem ser testados na Home após o onboarding. Voz e notificações chegam em fases
        futuras — não fingimos esse teste aqui.
      </p>
      <button onClick={onNext}>Concluir onboarding</button>
    </>
  );
}
