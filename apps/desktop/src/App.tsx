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

const SPLASH_DURATION = 2000;

function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, SPLASH_DURATION);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      className="fixed inset-0 z-100 flex flex-col items-center justify-center overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #1e1b4b 0%, #312e81 20%, #4338ca 45%, #7c3aed 70%, #6d28d9 100%)",
      }}
    >
      {/* Noise grain */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "128px 128px",
        }}
      />

      {/* Ambient light spots */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        style={{
          background:
            "radial-gradient(ellipse at 25% 15%, rgba(129,140,248,0.3) 0%, transparent 50%), radial-gradient(ellipse at 75% 80%, rgba(139,92,246,0.25) 0%, transparent 50%)",
        }}
      />

      {/* Glow behind logo */}
      <motion.div
        className="absolute pointer-events-none"
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 80, damping: 18, delay: 0.1 }}
        style={{
          width: 320,
          height: 320,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(165,120,255,0.5) 0%, rgba(124,58,237,0.2) 40%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Logo icon — only the checklist badge from SVG */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 180,
          damping: 14,
          delay: 0.15,
        }}
        className="relative"
        style={{ filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.4))" }}
      >
        <svg
          width="80"
          height="80"
          viewBox="168 67 44 45"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="m205.8 67.31h-29.97c-4.24 0-5.79 3.81-5.79 5.98v32.59c0 3.23 2.63 5.86 5.99 5.86h29.47c4.16 0 5.42-3.7 5.42-5.65v-32.49c0-3.46-2.2-6.29-5.12-6.29z"
            fill="rgba(255,255,255,0.15)"
            stroke="rgba(255,255,255,0.6)"
            strokeMiterlimit="10"
            strokeWidth="2"
          />
          <path
            d="m176.8 78.99 3.31 3.31 5.66-6.58"
            stroke="rgba(255,255,255,0.9)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />
          <path
            d="m176.8 89.46 2.68 2.68 5.92-5.92"
            stroke="rgba(255,255,255,0.9)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />
          <path
            d="m176.8 100.7 2.92 2.91 5.99-6.52"
            stroke="rgba(255,255,255,0.9)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />
          <path
            d="m190.4 78.61h13.06"
            stroke="rgba(255,255,255,0.7)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />
          <path
            d="m189.9 89.83h13.6"
            stroke="rgba(255,255,255,0.7)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />
          <path
            d="m190.4 100.7h13.06"
            stroke="rgba(255,255,255,0.7)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />
        </svg>
      </motion.div>

      {/* App name */}
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.45, ease: "easeOut" }}
        className="relative text-white text-3xl font-bold mt-5 tracking-wide"
        style={{ textShadow: "0 2px 16px rgba(0,0,0,0.3)" }}
      >
        КвизОК
      </motion.h1>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 0.7, y: 0 }}
        transition={{ delay: 0.55, duration: 0.5, ease: "easeOut" }}
        className="relative text-white text-base mt-2 tracking-wide font-medium"
      >
        Квизы, которые запоминаются
      </motion.p>

      {/* Progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-[3px]"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.6), rgba(255,255,255,0.05))",
          boxShadow: "0 0 12px rgba(255,255,255,0.35)",
        }}
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{ duration: SPLASH_DURATION / 1000, ease: "easeInOut" }}
      />
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
