import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useOutlet,
} from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Preferences } from "@capacitor/preferences";
import { HomePage } from "./pages/HomePage.tsx";
import { QuizPage } from "./pages/QuizPage.tsx";
import { ResultsPage } from "./pages/ResultsPage.tsx";
import { SetupPage } from "./pages/SetupPage.tsx";

function AnimatedRoutes() {
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="min-h-screen"
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}

export function App() {
  // null = checking, true = ready, false = needs setup
  const [setupDone, setSetupDone] = useState<boolean | null>(null);

  useEffect(() => {
    Preferences.get({ key: "deviceId" })
      .then(({ value }) => {
        setSetupDone(!!value);
      })
      .catch(() => {
        // If preferences unavailable (web/dev), check localStorage fallback
        setSetupDone(!!localStorage.getItem("player_name"));
      });
  }, []);

  if (setupDone === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
      </div>
    );
  }

  if (!setupDone) {
    return <SetupPage onComplete={() => setSetupDone(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AnimatedRoutes />}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          {/* Home — pick a quiz pack */}
          <Route path="/home" element={<HomePage />} />
          {/* Active quiz session */}
          <Route path="/quiz/:packId" element={<QuizPage />} />
          {/* Results screen after completing a quiz */}
          <Route path="/results/:sessionId" element={<ResultsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
