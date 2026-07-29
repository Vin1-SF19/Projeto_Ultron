import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatSocket, type ChatSocketStatus } from './chat-socket.js';
import type { ChatMessage } from './chat-types.js';
import { synthesizeSpeech, VoiceNotConfiguredError } from './voice-client.js';
import './chat.css';

export interface ChatPanelProps {
  onFaceEvent?: (eventType: string) => void;
}

const PROFILE_ID = 'chat-fast';

export function ChatPanel({ onFaceEvent }: ChatPanelProps) {
  const socketRef = useRef<ChatSocket | undefined>(undefined);
  const [socketStatus, setSocketStatus] = useState<ChatSocketStatus>('connecting');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  function speak(text: string) {
    synthesizeSpeech(text)
      .then((url) => {
        const audio = new Audio(url);
        audioRef.current = audio;
        onFaceEvent?.('voice.response.started');
        audio.addEventListener('ended', () => {
          URL.revokeObjectURL(url);
          onFaceEvent?.('voice.response.ended');
        });
        audio.addEventListener('error', () => {
          URL.revokeObjectURL(url);
          onFaceEvent?.('voice.response.error');
        });
        void audio.play();
      })
      .catch((error: unknown) => {
        if (error instanceof VoiceNotConfiguredError) return;
        onFaceEvent?.('voice.response.error');
      });
  }

  useEffect(() => {
    const socket = new ChatSocket();
    socketRef.current = socket;
    const unsubscribe = socket.onStatusChange(setSocketStatus);
    socket.connect();
    return () => {
      unsubscribe();
      socket.close();
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && typeof el.scrollTo === 'function') {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  function send() {
    const text = input.trim();
    if (!text || sending || !socketRef.current) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    const assistantId = crypto.randomUUID();
    const assistantMessage: ChatMessage = { id: assistantId, role: 'assistant', content: '', streaming: true };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput('');
    setSending(true);
    onFaceEvent?.('model_stream_start');

    socketRef.current.sendMessage(assistantId, PROFILE_ID, text, {
      onToken: (token) => {
        onFaceEvent?.('model_stream_token');
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + token } : m)),
        );
      },
      onDone: (response) => {
        onFaceEvent?.('model_stream_done');
        setSending(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, streaming: false, providerId: response.decision.providerId, modelId: response.decision.modelId }
              : m,
          ),
        );
        if (response.content.trim()) {
          speak(response.content);
        }
      },
      onError: (message) => {
        onFaceEvent?.('model_stream_error');
        setSending(false);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false, error: message } : m)),
        );
      },
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  const offline = socketStatus !== 'open';

  return (
    <div className="chat-panel">
      <div className="chat-panel__messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="chat-panel__empty">Converse com o Ultron. Nada foi enviado ainda.</div>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`chat-message chat-message--${message.role}`}>
            <div className="chat-message__bubble">
              <ReactMarkdown>{message.content || (message.streaming ? '…' : '')}</ReactMarkdown>
              {message.error && <div className="chat-message__error">Erro: {message.error}</div>}
              {message.modelId && !message.error && (
                <div className="chat-message__meta">
                  {message.providerId} · {message.modelId}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {offline && (
        <div className="chat-panel__offline-banner" role="status">
          Control Plane desconectado — reconectando…
        </div>
      )}

      <div className="chat-panel__composer">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escreva uma mensagem…"
          rows={2}
          disabled={offline}
          aria-label="Mensagem para o Ultron"
        />
        <button type="button" onClick={send} disabled={offline || sending || !input.trim()}>
          Enviar
        </button>
      </div>
    </div>
  );
}
