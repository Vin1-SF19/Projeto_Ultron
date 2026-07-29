export interface OpenAiModelsResponse {
  object: string;
  data: Array<{ id: string; object: string; created?: number; owned_by?: string }>;
}

export interface OpenAiChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface OpenAiChatResponse {
  id: string;
  choices: Array<{ message: { role: string; content: string }; finish_reason?: string }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * Cliente HTTP fino para qualquer endpoint compatível com a API OpenAI
 * (/v1/models, /v1/chat/completions) — reutilizável para OpenAI real, ou
 * qualquer gateway/proxy que fale esse protocolo (ex: Ollama remoto do
 * usuário atrás de um proxy compatível).
 */
export class OpenAiCompatibleClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  private headers(): Record<string, string> {
    return {
      authorization: `Bearer ${this.apiKey}`,
      'content-type': 'application/json',
    };
  }

  async listModels(signal?: AbortSignal): Promise<OpenAiModelsResponse> {
    const response = await fetch(`${this.baseUrl}/models`, { headers: this.headers(), signal });
    if (!response.ok) {
      throw new Error(`${this.baseUrl}/models respondeu ${response.status}`);
    }
    return (await response.json()) as OpenAiModelsResponse;
  }

  async chat(model: string, messages: OpenAiChatMessage[], signal?: AbortSignal): Promise<OpenAiChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ model, messages }),
      signal,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`${this.baseUrl}/chat/completions respondeu ${response.status}: ${text}`);
    }
    return (await response.json()) as OpenAiChatResponse;
  }

  /**
   * Streaming nativo via SSE (`data: {...}\n\n`, terminado por `data: [DONE]`),
   * conforme o protocolo padrão de /v1/chat/completions com stream: true.
   */
  async chatStream(
    model: string,
    messages: OpenAiChatMessage[],
    onToken: (token: string) => void,
    signal?: AbortSignal,
  ): Promise<OpenAiChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ model, messages, stream: true }),
      signal,
    });
    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => '');
      throw new Error(`${this.baseUrl}/chat/completions (stream) respondeu ${response.status}: ${text}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    let id = '';
    let finishReason: string | undefined;
    let usage: OpenAiChatResponse['usage'];

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!line.startsWith('data:')) continue;

        const data = line.slice('data:'.length).trim();
        if (data === '[DONE]') continue;

        const chunk = JSON.parse(data) as {
          id: string;
          choices: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
          usage?: OpenAiChatResponse['usage'];
        };
        id = chunk.id ?? id;
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          content += delta;
          onToken(delta);
        }
        if (chunk.choices[0]?.finish_reason) {
          finishReason = chunk.choices[0].finish_reason;
        }
        if (chunk.usage) {
          usage = chunk.usage;
        }
      }
    }

    return {
      id,
      choices: [{ message: { role: 'assistant', content }, finish_reason: finishReason }],
      usage,
    };
  }
}
