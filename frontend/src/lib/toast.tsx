"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from "lucide-react";

type ToastType = "success" | "info" | "warning" | "danger";

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (t: {
    type?: ToastType;
    title: string;
    description?: string;
  }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const meta: Record<
  ToastType,
  { icon: typeof CheckCircle2; ring: string; iconColor: string }
> = {
  success: { icon: CheckCircle2, ring: "border-l-success-500", iconColor: "text-success-600" },
  info: { icon: Info, ring: "border-l-info-500", iconColor: "text-info-600" },
  warning: { icon: AlertTriangle, ring: "border-l-warning-500", iconColor: "text-warning-600" },
  danger: { icon: XCircle, ring: "border-l-danger-500", iconColor: "text-danger-600" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>(
    ({ type = "success", title, description }) => {
      const id = ++counter.current;
      setToasts((prev) => [...prev, { id, type, title, description }]);
      setTimeout(() => dismiss(id), 3800);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => {
          const m = meta[t.type];
          const Icon = m.icon;
          return (
            <div
              key={t.id}
              role="status"
              className={`animate-slide-in-right flex items-start gap-3 rounded-xl border border-navy-200 border-l-4 ${m.ring} bg-white p-3.5 shadow-pop`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${m.iconColor}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy-900">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-xs text-navy-500">{t.description}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="rounded-md p-1 text-navy-400 transition hover:bg-navy-100 hover:text-navy-700"
              >
                <X className="h-4 w-4" />
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
