import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatSocket, type ChatSocketStatus } from './chat-socket.js';
import type { ChatMessage } from './chat-types.js';
import {
  isMediaSourceStreamingSupported,
  synthesizeSpeech,
  synthesizeSpeechStreamingIntoMediaSource,
  transcribeAudio,
  VoiceNotConfiguredError,
} from './voice-client.js';
import { MicrophonePermissionDeniedError, VoiceRecorder } from './voice-recorder.js';
import { AmplitudeLipSyncDriver } from './lip-sync.js';
import './chat.css';

export interface ChatPanelProps {
  onFaceEvent?: (eventType: string) => void;
  onMouthOpennessChange?: (amplitude: number) => void;
}

const PROFILE_ID = 'chat-fast';

type MicState = 'idle' | 'recording' | 'transcribing';

export function ChatPanel({ onFaceEvent, onMouthOpennessChange }: ChatPanelProps) {
  const socketRef = useRef<ChatSocket | undefined>(undefined);
  const [socketStatus, setSocketStatus] = useState<ChatSocketStatus>('connecting');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showTextChat, setShowTextChat] = useState(false);
  const [micState, setMicState] = useState<MicState>('idle');
  const [micError, setMicError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<VoiceRecorder | undefined>(undefined);
  const lipSyncRef = useRef<AmplitudeLipSyncDriver | undefined>(undefined);

  useEffect(() => {
    recorderRef.current = new VoiceRecorder();
    lipSyncRef.current = new AmplitudeLipSyncDriver((amplitude) => onMouthOpennessChange?.(amplitude));
    return () => {
      recorderRef.current?.cancel();
      lipSyncRef.current?.stop();
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        URL.revokeObjectURL(audio.src);
      }
    };
  }, [onMouthOpennessChange]);

  /** Interrompe a fala em andamento (se houver) — nunca sobrepor voz do usuário com a do assistente. */
  function stopSpeaking() {
    const audio = audioRef.current;
    if (!audio) return;
    lipSyncRef.current?.stop();
    audio.pause();
    URL.revokeObjectURL(audio.src);
    audioRef.current = null;
    setIsSpeaking(false);
    onFaceEvent?.('voice.response.ended');
  }

  function playAudioFromUrl(url: string) {
    const audio = new Audio(url);
    audioRef.current = audio;
    setIsSpeaking(true);
    onFaceEvent?.('voice.response.started');
    audio.addEventListener('playing', () => {
      lipSyncRef.current?.start({ audio });
    });
    audio.addEventListener('ended', () => {
      lipSyncRef.current?.stop();
      URL.revokeObjectURL(url);
      audioRef.current = null;
      setIsSpeaking(false);
      onFaceEvent?.('voice.response.ended');
    });
    audio.addEventListener('error', () => {
      lipSyncRef.current?.stop();
      URL.revokeObjectURL(url);
      audioRef.current = null;
      setIsSpeaking(false);
      onFaceEvent?.('voice.response.error');
    });
    audio.play().catch((error: unknown) => {
      console.error('Falha ao reproduzir áudio de voz:', error);
      URL.revokeObjectURL(url);
      audioRef.current = null;
      setIsSpeaking(false);
      onFaceEvent?.('voice.response.error');
    });
  }

  /**
   * Toca a resposta em voz assim que possível: com MediaSource disponível,
   * o áudio começa a tocar incrementalmente enquanto ainda está sendo
   * sintetizado (streaming real, seção Fase 7 do prompt mestre). Sem
   * suporte a MediaSource/audio-mpeg (varia entre WebViews), cai para o
   * modo anterior — baixar o áudio completo antes de tocar.
   */
  function speak(text: string) {
    if (!isMediaSourceStreamingSupported()) {
      synthesizeSpeech(text)
        .then((url) => playAudioFromUrl(url))
        .catch((error: unknown) => {
          if (error instanceof VoiceNotConfiguredError) return;
          onFaceEvent?.('voice.response.error');
        });
      return;
    }

    const mediaSource = new MediaSource();
    const url = URL.createObjectURL(mediaSource);
    let started = false;

    mediaSource.addEventListener(
      'sourceopen',
      () => {
        synthesizeSpeechStreamingIntoMediaSource(text, mediaSource).catch((error: unknown) => {
          if (error instanceof VoiceNotConfiguredError) {
            URL.revokeObjectURL(url);
            return;
          }
          console.warn('Streaming de voz falhou, tentando modo não incremental:', error);
          URL.revokeObjectURL(url);
          if (!started) {
            synthesizeSpeech(text)
              .then((fallbackUrl) => playAudioFromUrl(fallbackUrl))
              .catch(() => onFaceEvent?.('voice.response.error'));
          }
        });
      },
      { once: true },
    );

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.addEventListener(
      'playing',
      () => {
        started = true;
        setIsSpeaking(true);
        onFaceEvent?.('voice.response.started');
        lipSyncRef.current?.start({ audio });
      },
      { once: true },
    );
    audio.addEventListener('ended', () => {
      lipSyncRef.current?.stop();
      URL.revokeObjectURL(url);
      audioRef.current = null;
      setIsSpeaking(false);
      onFaceEvent?.('voice.response.ended');
    });
    audio.addEventListener('error', () => {
      lipSyncRef.current?.stop();
      URL.revokeObjectURL(url);
      audioRef.current = null;
      setIsSpeaking(false);
      if (started) onFaceEvent?.('voice.response.error');
    });
    audio.play().catch(() => {
      // Falha ao iniciar antes dos primeiros chunks chegarem — normal em
      // alguns navegadores; o listener 'playing' cuidará de iniciar o
      // estado assim que houver dados suficientes.
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

  function sendText(text: string) {
    if (!text.trim() || sending || !socketRef.current) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    const assistantId = crypto.randomUUID();
    const assistantMessage: ChatMessage = { id: assistantId, role: 'assistant', content: '', streaming: true };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
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

  function handleSendClick() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendText(text);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendClick();
    }
  }

  async function handleMicClick() {
    if (micState === 'idle') {
      setMicError(null);
      stopSpeaking();
      try {
        await recorderRef.current?.start();
        setMicState('recording');
        onFaceEvent?.('voice.listening.started');
      } catch (error) {
        if (error instanceof MicrophonePermissionDeniedError) {
          setMicError('Permissão de microfone negada. Habilite o acesso ao microfone para conversar por voz.');
        } else {
          setMicError('Não foi possível acessar o microfone.');
        }
      }
      return;
    }

    if (micState === 'recording') {
      setMicState('transcribing');
      try {
        const audio = await recorderRef.current!.stop();
        onFaceEvent?.('voice.transcript.partial');
        const result = await transcribeAudio(audio, 'gravacao.webm');
        setMicState('idle');
        if (result.text.trim()) {
          sendText(result.text);
        }
      } catch (error) {
        setMicState('idle');
        if (error instanceof VoiceNotConfiguredError) {
          setMicError('Voz ainda não configurada — configure em Configurações para conversar por voz.');
        } else {
          setMicError('Não foi possível transcrever o áudio.');
        }
      }
    }
  }

  const offline = socketStatus !== 'open';

  return (
    <div className="chat-panel">
      <div className="chat-panel__voice-controls">
        <button
          type="button"
          className={`chat-panel__mic-button chat-panel__mic-button--${micState}`}
          onClick={() => void handleMicClick()}
          disabled={offline || micState === 'transcribing'}
          aria-pressed={micState === 'recording'}
          aria-label={
            micState === 'recording' ? 'Parar de gravar' : micState === 'transcribing' ? 'Transcrevendo…' : 'Falar com o Ultron'
          }
        >
          {micState === 'recording' ? '⏹ Ouvindo…' : micState === 'transcribing' ? '… Transcrevendo' : '🎤 Falar'}
        </button>

        {isSpeaking && (
          <button type="button" className="chat-panel__stop-speaking" onClick={stopSpeaking} aria-label="Parar de falar">
            ⏹ Parar de falar
          </button>
        )}

        {micError && (
          <div className="chat-panel__mic-error" role="alert">
            {micError}
          </div>
        )}

        <label className="chat-panel__toggle-text">
          <input type="checkbox" checked={showTextChat} onChange={(e) => setShowTextChat(e.target.checked)} />
          Mostrar chat de texto
        </label>
      </div>

      {showTextChat && (
        <>
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
            <button type="button" onClick={handleSendClick} disabled={offline || sending || !input.trim()}>
              Enviar
            </button>
          </div>
        </>
      )}

      {!showTextChat && offline && (
        <div className="chat-panel__offline-banner" role="status">
          Control Plane desconectado — reconectando…
        </div>
      )}
    </div>
  );
}
