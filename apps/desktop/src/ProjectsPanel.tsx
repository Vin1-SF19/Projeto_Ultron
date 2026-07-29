import { useEffect, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import {
  ControlPlaneRequestError,
  addProject,
  fetchProjects,
  removeProject,
  type Project,
} from './control-plane-client.js';

export function ProjectsPanel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function reload() {
    try {
      const { projects } = await fetchProjects();
      setProjects(projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleAddProject() {
    setError(null);
    const selected = await open({ directory: true, multiple: false, title: 'Selecionar pasta do projeto' });
    if (!selected || Array.isArray(selected)) return;

    setLoading(true);
    try {
      await addProject({ path: selected });
      await reload();
    } catch (err) {
      setError(
        err instanceof ControlPlaneRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(id: string) {
    await removeProject(id);
    await reload();
  }

  return (
    <div className="status-card">
      <div className="status-row">
        <span>Projetos</span>
        <button onClick={() => void handleAddProject()} disabled={loading}>
          {loading ? 'Adicionando…' : '+ Adicionar pasta'}
        </button>
      </div>

      {error && (
        <div className="status-row">
          <span className="badge badge-error">erro</span>
          <span>{error}</span>
        </div>
      )}

      {projects.length === 0 && !error && (
        <div className="status-row">
          <span>Nenhum projeto adicionado ainda.</span>
        </div>
      )}

      {projects.map((project) => (
        <div className="status-row" key={project.id}>
          <span>
            {project.name}
            <br />
            <small>{project.path}</small>
          </span>
          <button onClick={() => void handleRemove(project.id)}>Remover</button>
        </div>
      ))}
    </div>
  );
}
