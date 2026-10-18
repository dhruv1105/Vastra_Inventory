"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastType = "success" | "error" | "info";

export type ToastOptions = {
  /** e.g. { label: "Undo", onClick: restore } — shown as a button in the toast. */
  action?: { label: string; onClick: () => void };
  /** Default 3s; 6s when there is an action, so there is time to press it. */
  durationMs?: number;
};

interface ToastItem extends ToastOptions {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const ICON = { success: CheckCircle2, error: AlertCircle, info: Info };
const ICON_TONE = { success: "text-success", error: "text-danger", info: "text-primary-soft" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType, options: ToastOptions = {}) => {
      const id = ++nextId.current;
      // Keep at most 3 on screen; the oldest goes first.
      setToasts((prev) => [...prev.slice(-2), { id, message, type, ...options }]);
      const ms = options.durationMs ?? (options.action ? 6000 : 3000);
      timers.current.set(id, setTimeout(() => dismiss(id), ms));
    },
    [dismiss],
  );

  useEffect(() => {
    const all = timers.current;
    return () => all.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+0.75rem)] z-toast flex flex-col items-center gap-2 px-4 md:bottom-8">
        {toasts.map((t) => {
          const Icon = ICON[t.type];
          return (
            <div
              key={t.id}
              role={t.type === "error" ? "alert" : "status"}
              className="animate-slide-up pointer-events-auto flex max-w-md items-center gap-3 rounded-md bg-fg py-2.5 pl-4 pr-2 text-sm text-canvas shadow-lg"
            >
              <Icon aria-hidden="true" className={cn("h-5 w-5 shrink-0", ICON_TONE[t.type])} />
              <span className="min-w-0 flex-1">{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action?.onClick();
                    dismiss(t.id);
                  }}
                  className="rounded-sm px-2 py-1 font-semibold text-primary-soft hover:bg-canvas/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft"
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
                className="grid h-8 w-8 place-items-center rounded-sm text-canvas/70 hover:bg-canvas/10 hover:text-canvas"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
