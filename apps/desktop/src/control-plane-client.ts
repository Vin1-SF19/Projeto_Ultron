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

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${CONTROL_PLANE_BASE_URL}${path}`);
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
