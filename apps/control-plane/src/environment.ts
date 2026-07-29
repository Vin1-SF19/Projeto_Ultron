import os from 'node:os';

export interface EnvironmentSnapshot {
  platform: NodeJS.Platform;
  osRelease: string;
  arch: string;
  cpuModel: string;
  cpuCores: number;
  totalMemoryBytes: number;
  freeMemoryBytes: number;
  nodeVersion: string;
  uptimeSeconds: number;
}

/** Detecta hardware/runtime real da máquina — nunca presumir capacidades. */
export function detectEnvironment(): EnvironmentSnapshot {
  const cpus = os.cpus();

  return {
    platform: os.platform(),
    osRelease: os.release(),
    arch: os.arch(),
    cpuModel: cpus[0]?.model ?? 'desconhecido',
    cpuCores: cpus.length,
    totalMemoryBytes: os.totalmem(),
    freeMemoryBytes: os.freemem(),
    nodeVersion: process.version,
    uptimeSeconds: process.uptime(),
  };
}
