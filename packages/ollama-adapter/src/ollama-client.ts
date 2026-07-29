export interface OllamaTagsResponse {
  models: Array<{
    name: string;
    model: string;
    size: number;
    details: {
      parameter_size?: string;
      quantization_level?: string;
      family?: string;
    };
    capabilities?: string[];
  }>;
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface OllamaChatResponse {
  message: { role: string; content: string };
  prompt_eval_count?: number;
  eval_count?: number;
  total_duration?: number;
}

/** Cliente HTTP fino para a API local do Ollama — sem lógica de domínio. */
export class OllamaClient {
  constructor(private readonly baseUrl: string) {}

  async listTags(signal?: AbortSignal): Promise<OllamaTagsResponse> {
    const response = await fetch(`${this.baseUrl}/api/tags`, { signal });
    if (!response.ok) {
      throw new Error(`Ollama /api/tags respondeu ${response.status}`);
    }
    return (await response.json()) as OllamaTagsResponse;
  }

  async chat(model: string, messages: OllamaChatMessage[], signal?: AbortSignal): Promise<OllamaChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false }),
      signal,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Ollama /api/chat respondeu ${response.status}: ${text}`);
    }
    return (await response.json()) as OllamaChatResponse;
  }
}
