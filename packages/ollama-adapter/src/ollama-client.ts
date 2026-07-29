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

  /**
   * Streaming nativo do Ollama: cada linha do corpo é um JSON completo
   * (NDJSON), terminando com um objeto onde `done: true`. Não há SSE aqui.
   */
  async chatStream(
    model: string,
    messages: OllamaChatMessage[],
    onToken: (token: string) => void,
    signal?: AbortSignal,
  ): Promise<OllamaChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: true }),
      signal,
    });
    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => '');
      throw new Error(`Ollama /api/chat (stream) respondeu ${response.status}: ${text}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    let final: OllamaChatResponse | undefined;

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!line) continue;

        const chunk = JSON.parse(line) as OllamaChatResponse & { done?: boolean };
        if (chunk.message?.content) {
          content += chunk.message.content;
          onToken(chunk.message.content);
        }
        if (chunk.done) {
          final = chunk;
        }
      }
    }

    if (!final) {
      throw new Error('Ollama /api/chat (stream) encerrou sem enviar o chunk final (done: true).');
    }
    return { ...final, message: { role: 'assistant', content } };
  }
}
