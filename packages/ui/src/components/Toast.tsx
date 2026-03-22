import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/cn.ts";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

const variantClasses: Record<ToastVariant, string> = {
  success: "bg-emerald-50 border-emerald-300 text-emerald-800",
  error: "bg-red-50 border-red-300 text-red-800",
  info: "bg-slate-50 border-slate-300 text-slate-800",
};

const variantIcons: Record<ToastVariant, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = React.useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = ++nextId;
      setToasts((prev) => [...prev.slice(-4), { id, message, variant }]);
      setTimeout(() => dismiss(id), 3500);
    },
    [dismiss],
  );

  const value = React.useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            role="status"
            aria-live="polite"
            data-variant={toast.variant}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg",
              variantClasses[toast.variant],
            )}
          >
            <span className="text-lg" aria-hidden="true">
              {variantIcons[toast.variant]}
            </span>
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
              className="ml-2 rounded p-0.5 opacity-60 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
            >
              ✕
            </button>
          </motion.div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
