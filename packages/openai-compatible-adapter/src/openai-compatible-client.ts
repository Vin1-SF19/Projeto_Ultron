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
}
