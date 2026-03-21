import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = ++nextId;
      setToasts((prev) => [...prev.slice(-4), { id, message, variant }]);
      const timer = setTimeout(() => dismiss(id), 3500);
      timersRef.current.set(id, timer);
    },
    [dismiss],
  );

  const variantStyles: Record<ToastVariant, string> = {
    success: "bg-emerald-600 border-emerald-500",
    error: "bg-red-700 border-red-600",
    info: "bg-slate-700 border-slate-600",
  };

  const icons: Record<ToastVariant, string> = {
    success: "✓",
    error: "✕",
    info: "ℹ",
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm text-white shadow-xl pointer-events-auto max-w-sm animate-slide-in ${variantStyles[toast.variant]}`}
          >
            <span className="font-bold text-base leading-none">
              {icons[toast.variant]}
            </span>
            <span className="flex-1">{toast.message}</span>
            <button
              className="ml-2 opacity-60 hover:opacity-100 transition-opacity text-base leading-none"
              onClick={() => dismiss(toast.id)}
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
