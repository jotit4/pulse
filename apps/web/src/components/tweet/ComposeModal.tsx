import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { TWEET_MAX_LENGTH } from "@pulse/shared";
import { useCreateTweet } from "@/hooks/useCreateTweet";
import { useAuth } from "@/auth/useAuth";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { UserAvatar } from "@/components/user/UserAvatar";

interface ComposeModalProps {
  /** Controla si el modal está abierto. */
  isOpen: boolean;
  /** Callback para cerrar el modal. */
  onClose: () => void;
}

/**
 * Modal de composición de tweet estilo X.
 * - Overlay a pantalla completa con backdrop oscuro semi-transparente.
 * - Textarea con autofocus, contador de caracteres y límite de 280.
 * - Cierra con: botón X, tecla Escape, click en el backdrop.
 * - Bloquea el scroll del body mientras está abierto.
 * - Accesible: role="dialog", aria-modal="true", foco en textarea al abrir.
 */
export function ComposeModal({ isOpen, onClose }: ComposeModalProps) {
  const [content, setContent] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const createTweet = useCreateTweet();
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = content.trim();
  const charCount = content.length;
  const isOverLimit = charCount > TWEET_MAX_LENGTH;
  const isDisabled = createTweet.isPending || trimmed.length === 0 || isOverLimit;

  // Bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  // Autofocus en el textarea al abrir
  useEffect(() => {
    if (isOpen) {
      // Pequeño delay para que el portal esté montado
      const id = setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Limpiar estado al cerrar
  useEffect(() => {
    if (!isOpen) {
      setContent("");
      setApiError(null);
    }
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    if (isDisabled) return;

    try {
      await createTweet.mutateAsync({ content: trimmed });
      setContent("");
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err.message);
      } else {
        setApiError("Error inesperado. Intenta de nuevo.");
      }
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    // Solo cerrar si el click fue directamente en el backdrop (no en la tarjeta)
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  if (!isOpen) return null;

  const modal = (
    // Backdrop: overlay fijo a pantalla completa
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
      style={{ backgroundColor: "rgba(91, 112, 131, 0.4)" }}
      onClick={handleBackdropClick}
    >
      {/* Tarjeta del modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Componer tweet"
        className="w-full max-w-lg rounded-2xl shadow-xl"
        style={{
          backgroundColor: "var(--color-x-bg)",
          border: "1px solid var(--color-x-border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center px-4 pt-3 pb-2"
          style={{ borderBottom: "1px solid var(--color-x-border)" }}
        >
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[var(--color-x-surface)]"
            style={{ color: "var(--color-x-text)" }}
          >
            {/* Ícono X de cierre */}
            <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" aria-hidden="true">
              <path d="M10.59 12 4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12Z" />
            </svg>
          </button>
        </div>

        {/* Cuerpo del modal */}
        <form onSubmit={handleSubmit} className="px-4 py-3 space-y-3">
          <div className="flex gap-3">
            {user && (
              <div className="flex-shrink-0 pt-1">
                <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="¿Qué está pasando?"
                aria-label="Contenido del tweet"
                rows={4}
                disabled={createTweet.isPending}
                className="w-full resize-none bg-transparent px-0 py-2 text-lg outline-none transition-colors disabled:opacity-60 placeholder:text-[var(--color-x-muted)]"
                style={{ color: "var(--color-x-text)" }}
              />
            </div>
          </div>

          <ErrorMessage message={apiError} />

          {/* Footer: contador + botón */}
          <div
            className="flex items-center justify-end gap-4 pt-2"
            style={{ borderTop: "1px solid var(--color-x-border)" }}
          >
            <span
              className="text-sm"
              style={{ color: isOverLimit ? "var(--color-x-danger)" : "var(--color-x-muted)" }}
              aria-live="polite"
              aria-label={`${charCount} de ${TWEET_MAX_LENGTH} caracteres`}
            >
              {charCount}/{TWEET_MAX_LENGTH}
            </span>

            <Button type="submit" disabled={isDisabled} isLoading={createTweet.isPending}>
              Postear
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
