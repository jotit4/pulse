import { useState, useRef, useEffect } from "react";
import type { FormEvent } from "react";
import { chatApi, type ChatMessage } from "@/api/client";
import { SparkleIcon } from "@/components/icons/Icons";
import { Button } from "@/components/ui/Button";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfigured, setUnconfigured] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll al último mensaje cada vez que cambia la lista
  useEffect(() => {
    const el = bottomRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const history: Message[] = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const payload: ChatMessage[] = history.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const result = await chatApi.send(payload);

      if (result.configured === false) {
        setUnconfigured(true);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al conectar con Pulse AI.");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e as unknown as FormEvent);
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Encabezado */}
      <header
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-x-bg) 80%, transparent)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--color-x-border)",
        }}
      >
        <SparkleIcon filled width={22} height={22} />
        <h1 className="text-lg font-bold" style={{ color: "var(--color-x-text)" }}>
          Pulse AI
        </h1>
      </header>

      {/* Aviso de no configurado */}
      {unconfigured && (
        <div
          className="mx-4 mt-4 rounded-xl px-4 py-3 text-sm"
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-x-brand) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-x-brand) 30%, transparent)",
            color: "var(--color-x-muted)",
          }}
        >
          <strong style={{ color: "var(--color-x-text)" }}>Pulse AI no está activado.</strong> Para
          habilitarlo, configurá{" "}
          <code
            className="rounded px-1 py-0.5 text-xs font-mono"
            style={{ backgroundColor: "var(--color-x-surface)" }}
          >
            GROQ_API_KEY
          </code>{" "}
          en el servidor. Obtené una clave gratis en{" "}
          <a
            href="https://console.groq.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--color-x-brand)" }}
          >
            console.groq.com
          </a>
          .
        </div>
      )}

      {/* Historial de mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ minHeight: 0 }}>
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
            <SparkleIcon width={48} height={48} className="text-[var(--color-x-muted)]" />
            <p className="text-center text-base" style={{ color: "var(--color-x-muted)" }}>
              Preguntale lo que quieras a{" "}
              <strong style={{ color: "var(--color-x-text)" }}>Pulse AI</strong>
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
              style={
                msg.role === "user"
                  ? {
                      backgroundColor: "var(--color-x-brand)",
                      color: "#ffffff",
                      borderBottomRightRadius: "4px",
                    }
                  : {
                      backgroundColor: "var(--color-x-surface)",
                      color: "var(--color-x-text)",
                      border: "1px solid var(--color-x-border)",
                      borderBottomLeftRadius: "4px",
                    }
              }
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl px-4 py-3 text-sm"
              style={{
                backgroundColor: "var(--color-x-surface)",
                border: "1px solid var(--color-x-border)",
                color: "var(--color-x-muted)",
                borderBottomLeftRadius: "4px",
              }}
            >
              <span className="flex gap-1 items-center">
                <span
                  className="h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:-0.3s]"
                  style={{ backgroundColor: "var(--color-x-muted)" }}
                />
                <span
                  className="h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:-0.15s]"
                  style={{ backgroundColor: "var(--color-x-muted)" }}
                />
                <span
                  className="h-1.5 w-1.5 rounded-full animate-bounce"
                  style={{ backgroundColor: "var(--color-x-muted)" }}
                />
              </span>
            </div>
          </div>
        )}

        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{
              backgroundColor: "color-mix(in srgb, var(--color-x-danger) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--color-x-danger) 30%, transparent)",
              color: "var(--color-x-danger)",
            }}
          >
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid var(--color-x-border)" }}>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Preguntá lo que quieras…"
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm outline-none transition-colors"
            style={{
              backgroundColor: "var(--color-x-surface)",
              border: "1px solid var(--color-x-border)",
              color: "var(--color-x-text)",
              maxHeight: "120px",
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            isLoading={isLoading}
            aria-label="Enviar mensaje"
            className="shrink-0"
          >
            Enviar
          </Button>
        </form>
        <p className="mt-1 text-xs text-center" style={{ color: "var(--color-x-muted)" }}>
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
}
