import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Component, type ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { invoke } from "@tauri-apps/api/core";
import { AnimatePresence, motion } from "framer-motion";
import { DashboardPage } from "./pages/DashboardPage.tsx";
import { QuizEditorPage } from "./pages/QuizEditorPage.tsx";
import { PreviewPage } from "./pages/PreviewPage.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";
import { TourProvider } from "./context/TourContext.tsx";
import { AppTour } from "./components/AppTour.tsx";
import { DemoProvider } from "./context/DemoContext.tsx";
import { DemoRunner } from "./components/DemoRunner.tsx";
import { ToastProvider } from "./context/ToastContext.tsx";
import { Spinner } from "@konstruktor/ui";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div
          style={{
            padding: 32,
            background: "#fef2f2",
            minHeight: "100vh",
            fontFamily: "monospace",
          }}
        >
          <h2 style={{ color: "#dc2626", marginBottom: 12 }}>
            ❌ Ошибка рендера
          </h2>
          <pre
            style={{
              color: "#991b1b",
              whiteSpace: "pre-wrap",
              fontSize: 13,
            }}
          >
            {err.message}
            {"\n\n"}
            {err.stack}
          </pre>
          <button
            style={{
              marginTop: 16,
              padding: "8px 16px",
              background: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
            onClick={() => this.setState({ error: null })}
          >
            Попробовать снова
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AnimatedRoutes() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/editor/new" element={<NewQuizRedirect />} />
        <Route path="/editor/:quizId" element={<QuizEditorPage />} />
        <Route path="/preview/:quizId" element={<PreviewPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </ErrorBoundary>
  );
}

/** Creates a new quiz then redirects to its editor. */
function NewQuizRedirect() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<string>("create_quiz")
      .then((id) => navigate(`/editor/${id}`, { replace: true }))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e)),
      );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-4 bg-slate-50 text-slate-700">
        <p className="text-red-500">{error}</p>
        <button
          className="text-indigo-600 underline"
          onClick={() => navigate("/dashboard")}
        >
          На главную
        </button>
      </div>
    );
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Spinner size="lg" />
    </div>
  );
}

function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1600);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="flex flex-col items-center gap-4"
      >
        {/* Logomark */}
        <div className="w-20 h-20 rounded-[22px] bg-white/15 backdrop-blur flex items-center justify-center shadow-2xl">
          <span className="text-white font-black text-4xl tracking-tight select-none">
            K
          </span>
        </div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-white/90 text-xl font-semibold tracking-wide"
        >
          Konstruktor
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="text-white text-sm"
        >
          Квизы, которые запоминаются
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export function App() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TourProvider>
        <DemoProvider>
          <ToastProvider>
            <AnimatePresence>
              {!splashDone && (
                <SplashScreen onDone={() => setSplashDone(true)} />
              )}
            </AnimatePresence>
            {splashDone && (
              <BrowserRouter>
                <AppTour />
                <DemoRunner />
                <AnimatedRoutes />
              </BrowserRouter>
            )}
          </ToastProvider>
        </DemoProvider>
      </TourProvider>
    </QueryClientProvider>
  );
}
