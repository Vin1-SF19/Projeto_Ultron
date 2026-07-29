export type ChatMessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  /** Presente enquanto o assistente ainda está recebendo tokens. */
  streaming?: boolean;
  error?: string;
  providerId?: string;
  modelId?: string;
}
