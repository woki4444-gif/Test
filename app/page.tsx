"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type Mode = "conversation" | "practice" | "translate";
type Role = "user" | "assistant";

interface Message {
  role: Role;
  content: string;
}

const MODE_LABELS: Record<Mode, { label: string; emoji: string; hint: string }> = {
  conversation: {
    label: "Conversa",
    emoji: "💬",
    hint: "Chat freely in Portuguese — corrections included",
  },
  practice: {
    label: "Prática",
    emoji: "📖",
    hint: "Write in English, get translated + taught",
  },
  translate: {
    label: "Tradução",
    emoji: "🔄",
    hint: "Translate between English and Portuguese",
  },
};

const TOPICS = [
  "Fala sobre Lisboa 🏙️",
  "O que fazes ao fim de semana? 🌞",
  "Descreve a tua comida favorita 🍽️",
  "Viajar em Portugal 🚂",
  "Música portuguesa 🎵",
  "O teu trabalho / estudos 💼",
  "Tempo livre / hobies 🎨",
  "Família e amigos 👪",
];

const WELCOME: Record<Mode, string> = {
  conversation:
    "Olá! 👋 Sou o teu tutor de português europeu. Podemos falar sobre qualquer coisa — Lisboa, comida, viagens... O que queres praticar hoje?",
  practice:
    "Hello! 👋 Write anything in English and I'll translate it into European Portuguese (pt-PT) with vocabulary notes and pronunciation tips.",
  translate:
    "Hello! 👋 Send me any text in English or Portuguese and I'll translate it for you, using correct European Portuguese vocabulary.",
};

export default function ChatPage() {
  const [mode, setMode] = useState<Mode>("conversation");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME.conversation },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showTopics, setShowTopics] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const switchMode = useCallback((newMode: Mode) => {
    if (streaming) {
      abortRef.current?.abort();
    }
    setMode(newMode);
    setMessages([{ role: "assistant", content: WELCOME[newMode] }]);
    setInput("");
    setStreaming(false);
    setShowTopics(true);
  }, [streaming]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    setShowTopics(false);
    const userMsg: Message = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const placeholderIndex = updatedMessages.length;
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, mode }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) throw new Error("API error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[placeholderIndex] = { role: "assistant", content: accumulated };
          return next;
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setMessages((prev) => {
          const next = [...prev];
          next[placeholderIndex] = {
            role: "assistant",
            content: "Desculpa, ocorreu um erro. Tenta outra vez! 🙏",
          };
          return next;
        });
      }
    } finally {
      setStreaming(false);
    }
  }, [messages, mode, streaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Header */}
      <header
        style={{ background: "var(--header)" }}
        className="text-white px-4 pt-10 pb-3 flex-shrink-0 shadow-md"
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-semibold leading-tight">
              🇵🇹 Tutor Português
            </h1>
            <p className="text-xs opacity-80">Português Europeu (pt-PT)</p>
          </div>
          <button
            onClick={() => setShowTopics((v) => !v)}
            className="text-xs opacity-80 border border-white/30 rounded-full px-3 py-1"
          >
            Tópicos
          </button>
        </div>

        {/* Mode switcher */}
        <div className="flex gap-1 bg-black/20 rounded-xl p-1 mt-1">
          {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`mode-btn ${mode === m ? "active" : "inactive"}`}
            >
              {MODE_LABELS[m].emoji} {MODE_LABELS[m].label}
            </button>
          ))}
        </div>
        <p className="text-xs opacity-60 mt-1 text-center">
          {MODE_LABELS[mode].hint}
        </p>
      </header>

      {/* Topic chips */}
      {showTopics && (
        <div
          className="flex-shrink-0 flex gap-2 overflow-x-auto px-4 py-2"
          style={{ background: "#f8f8f8", borderBottom: "1px solid #e0e0e0" }}
        >
          {TOPICS.map((topic) => (
            <button
              key={topic}
              className="topic-chip"
              onClick={() => sendMessage(topic)}
            >
              {topic}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
        style={{ background: "var(--bg)" }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <span className="text-lg mr-1 mt-auto mb-1 flex-shrink-0">🇵🇹</span>
            )}
            <div className={`chat-bubble ${msg.role === "user" ? "user" : "ai"}`}>
              {msg.content === "" && streaming && i === messages.length - 1 ? (
                <span className="flex gap-1 items-center py-1">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </span>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        className="flex-shrink-0 px-4 py-3 flex items-end gap-2"
        style={{
          background: "white",
          borderTop: "1px solid #e0e0e0",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleTextareaInput}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={
            mode === "conversation"
              ? "Escreve em português..."
              : mode === "practice"
              ? "Write in English to practice..."
              : "Type in English or Portuguese..."
          }
          disabled={streaming}
          style={{
            flex: 1,
            background: "#f5f5f5",
            border: "1px solid #ddd",
            borderRadius: "20px",
            padding: "10px 16px",
            fontSize: "15px",
            lineHeight: "1.4",
            overflowY: "hidden",
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || streaming}
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            background: !input.trim() || streaming ? "#ccc" : "#006600",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: !input.trim() || streaming ? "not-allowed" : "pointer",
            flexShrink: 0,
            transition: "background 0.15s",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
