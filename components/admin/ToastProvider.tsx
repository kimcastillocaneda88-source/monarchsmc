"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error" | "info";

interface Toast {
  id: number;
  tone: Tone;
  message: string;
}

interface ToastApi {
  show: (tone: Tone, message?: string) => void;
}

const ToastContext = createContext<ToastApi>({ show: () => undefined });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

/**
 * Lightweight feedback for admin actions.
 *
 * The live region is polite for success and assertive for errors, so a failed
 * operation is announced immediately to a screen reader rather than queued.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((tone: Tone, message?: string) => {
    if (!message) return;
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 6000);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-100 flex flex-col items-center gap-2 sm:right-6 sm:bottom-6 sm:left-auto sm:items-end">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            aria-live={toast.tone === "error" ? "assertive" : "polite"}
            className={cn(
              "pointer-events-auto flex max-w-md items-start gap-3 border px-5 py-4 shadow-2xl backdrop-blur-md",
              toast.tone === "success" && "border-success/60 bg-charcoal text-success",
              toast.tone === "error" && "border-danger/60 bg-charcoal text-danger",
              toast.tone === "info" && "border-gold/60 bg-charcoal text-gold",
            )}
          >
            <span aria-hidden="true" className="mt-px">
              {toast.tone === "success" ? "✓" : toast.tone === "error" ? "▲" : "●"}
            </span>
            <p className="text-sm leading-relaxed text-bone">{toast.message}</p>
            <button
              type="button"
              onClick={() => setToasts((current) => current.filter((t) => t.id !== toast.id))}
              className="-mt-1 -mr-1 px-1 text-lg leading-none text-smoke transition hover:text-bone"
            >
              <span aria-hidden="true">×</span>
              <span className="sr-only">Dismiss</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
