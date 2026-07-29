const CONTROL_PLANE_BASE_URL = 'http://127.0.0.1:4577';

export interface SystemStatus {
  status: string;
  version: string;
  startedAt: string;
  uptimeSeconds: number;
  database: { filePath: string };
}

export interface EnvironmentSnapshot {
  platform: string;
  osRelease: string;
  arch: string;
  cpuModel: string;
  cpuCores: number;
  totalMemoryBytes: number;
  freeMemoryBytes: number;
  nodeVersion: string;
  uptimeSeconds: number;
}

export interface SystemCapabilities {
  environment: EnvironmentSnapshot;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  addedAt: string;
}

export interface ErrorResponseBody {
  error: { code: string; message: string; correlationId: string; details?: unknown };
}

export class ControlPlaneRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ControlPlaneRequestError';
  }
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${CONTROL_PLANE_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Control Plane respondeu ${response.status} em ${path}`);
  }
  return (await response.json()) as T;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${CONTROL_PLANE_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as ErrorResponseBody | null;
    throw new ControlPlaneRequestError(
      errorBody?.error.message ?? `Control Plane respondeu ${response.status} em ${path}`,
      errorBody?.error.code ?? 'unknown_error',
    );
  }
  return (await response.json()) as T;
}

async function deleteJson<T>(path: string): Promise<T> {
  const response = await fetch(`${CONTROL_PLANE_BASE_URL}${path}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(`Control Plane respondeu ${response.status} em ${path}`);
  }
  return (await response.json()) as T;
}

export function fetchHealth() {
  return getJson<{ status: string; uptimeSeconds: number }>('/health');
}

export function fetchSystemStatus() {
  return getJson<SystemStatus>('/api/v1/system/status');
}

export function fetchSystemCapabilities() {
  return getJson<SystemCapabilities>('/api/v1/system/capabilities');
}

export function fetchProjects() {
  return getJson<{ projects: Project[] }>('/api/v1/projects');
}

export function addProject(input: { path: string; name?: string }) {
  return postJson<{ project: Project }>('/api/v1/projects', input);
}

export function removeProject(id: string) {
  return deleteJson<{ removed: boolean }>(`/api/v1/projects/${encodeURIComponent(id)}`);
}

export type OnboardingStep =
  | 'welcome'
  | 'diagnostics'
  | 'assistant'
  | 'models'
  | 'openclaw'
  | 'projects'
  | 'integrations'
  | 'security'
  | 'test'
  | 'done';

export interface OnboardingProgress {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  completedAt?: string;
}

export function fetchOnboardingProgress() {
  return getJson<OnboardingProgress>('/api/v1/onboarding');
}

export function advanceOnboarding(completedStep: OnboardingStep, nextStep: OnboardingStep) {
  return postJson<OnboardingProgress>('/api/v1/onboarding/advance', { completedStep, nextStep });
}

export function resetOnboarding() {
  return postJson<OnboardingProgress>('/api/v1/onboarding/reset', {});
}

export type AutonomyLevel = 'observation' | 'assistance' | 'controlled_execution' | 'bounded_autonomy';

export interface AutonomyConfig {
  level: AutonomyLevel;
  boundedRules: unknown[];
}

export function fetchAutonomyConfig() {
  return getJson<AutonomyConfig>('/api/v1/settings/autonomy');
}

async function putJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${CONTROL_PLANE_BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as ErrorResponseBody | null;
    throw new ControlPlaneRequestError(
      errorBody?.error.message ?? `Control Plane respondeu ${response.status} em ${path}`,
      errorBody?.error.code ?? 'unknown_error',
    );
  }
  return (await response.json()) as T;
}

export function putAutonomyLevel(level: AutonomyLevel) {
  return putJson<AutonomyConfig>('/api/v1/settings/autonomy', { level });
}

export interface Provider {
  id: string;
  name: string;
  kind: string;
  baseUrl?: string;
  enabled: boolean;
}

export function fetchProviders() {
  return getJson<{ providers: Provider[] }>('/api/v1/providers');
}

export function configureProvider(input: { name: string; kind: string; baseUrl?: string; apiKey?: string }) {
  return postJson<{ provider: Provider }>('/api/v1/providers/config', input);
}

export interface OpenClawStatus {
  state: string;
  health: { ok: boolean; detail?: unknown } | null;
  note?: string;
}

export function fetchOpenClawStatus() {
  return getJson<OpenClawStatus>('/api/v1/integrations/openclaw/status');
}
