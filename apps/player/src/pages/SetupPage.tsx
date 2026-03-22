import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@konstruktor/ui";
import { registerDevice } from "../services/sync.ts";
import { downloadPacksForCode } from "../services/sync.ts";

type Props = {
  onComplete: () => void;
};

type Step = "name" | "avatar" | "code" | "loading" | "error";

export const AVATARS = [
  { emoji: "🦊", bg: "from-orange-400 to-red-500" },
  { emoji: "🐸", bg: "from-emerald-400 to-green-600" },
  { emoji: "🐻", bg: "from-amber-500 to-orange-700" },
  { emoji: "🐱", bg: "from-slate-300 to-slate-500" },
  { emoji: "🐺", bg: "from-indigo-300 to-slate-500" },
  { emoji: "🦋", bg: "from-pink-400 to-violet-500" },
  { emoji: "🐧", bg: "from-cyan-400 to-blue-600" },
  { emoji: "🦁", bg: "from-yellow-300 to-amber-500" },
] as const;

export function SetupPage({ onComplete }: Props) {
  const [step, setStep] = useState<Step>("name");
  const [playerName, setPlayerName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [teacherCode, setTeacherCode] = useState("");
  const [error, setError] = useState("");
  const [packCount, setPackCount] = useState(0);

  async function handleConnect() {
    if (teacherCode.trim().length < 3) {
      setError("Введите корректный код");
      return;
    }
    setStep("loading");
    setError("");
    const name = playerName.trim() || "Ученик";
    localStorage.setItem("player_name", name);
    localStorage.setItem("player_avatar", String(selectedAvatar));
    try {
      // Register device (fail silently — sync can happen later)
      try {
        await registerDevice(name, "android", teacherCode.trim().toUpperCase());
      } catch {
        // Ignore registration failure — can work offline
      }
      // Download quizzes for this teacher code
      const count = await downloadPacksForCode(
        teacherCode.trim().toUpperCase(),
      );
      setPackCount(count);
      setTimeout(onComplete, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось подключиться");
      setStep("error");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6">
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="mb-8 text-center"
      >
        <img
          src="/logo.svg"
          alt="КвизОК"
          className="mx-auto mb-3 h-20 w-20 drop-shadow-lg"
          draggable={false}
        />
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Квиз<span className="text-indigo-300">ОК</span>
        </h1>
        <p className="mt-1 text-indigo-200 text-sm">
          Умные квизы для умных учеников
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
      >
        {step === "loading" && (
          <div className="flex flex-col items-center py-6 gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <p className="text-slate-600 font-medium">Загружаем квизы…</p>
          </div>
        )}

        {step === "name" && (
          <>
            <h2 className="text-xl font-bold text-slate-800 mb-1">
              Привет! 👋
            </h2>
            <p className="text-sm text-slate-500 mb-5">Как тебя зовут?</p>
            <input
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-indigo-400 transition-colors mb-4 text-base"
              placeholder="Имя ученика"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setStep("avatar")}
              autoFocus
            />
            <Button className="w-full" onClick={() => setStep("avatar")}>
              Продолжить →
            </Button>
          </>
        )}

        {step === "avatar" && (
          <>
            <h2 className="text-xl font-bold text-slate-800 mb-1">
              Выбери аватар
            </h2>
            <p className="text-sm text-slate-500 mb-5">
              Он будет виден на доске результатов
            </p>
            <div className="grid grid-cols-4 gap-3 mb-6">
              <AnimatePresence>
                {AVATARS.map((av, i) => (
                  <motion.button
                    key={i}
                    type="button"
                    whileTap={{ scale: 0.88 }}
                    onClick={() => setSelectedAvatar(i)}
                    className={`relative flex aspect-square items-center justify-center rounded-2xl bg-gradient-to-br ${av.bg} text-3xl shadow-sm transition-all ${selectedAvatar === i ? "ring-4 ring-indigo-500 ring-offset-2 scale-105 shadow-md" : "opacity-80 hover:opacity-100"}`}
                    aria-label={`Аватар ${av.emoji}`}
                  >
                    {av.emoji}
                    {selectedAvatar === i && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white text-xs">
                        ✓
                      </span>
                    )}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setStep("name")}
              >
                ← Назад
              </Button>
              <Button className="flex-1" onClick={() => setStep("code")}>
                Готово →
              </Button>
            </div>
          </>
        )}

        {(step === "code" || step === "error") && (
          <>
            <h2 className="text-xl font-bold text-slate-800 mb-1">
              Код учителя
            </h2>
            <p className="text-sm text-slate-500 mb-5">
              Попроси учителя показать код — введи его здесь, и квизы появятся
              автоматически
            </p>
            <input
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-indigo-400 transition-colors mb-2 text-base font-mono tracking-widest uppercase text-center"
              placeholder="ABC123"
              maxLength={10}
              value={teacherCode}
              onChange={(e) => {
                setTeacherCode(e.target.value.toUpperCase());
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && void handleConnect()}
            />
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <div className="flex gap-2 mt-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setStep("name");
                  setError("");
                }}
              >
                ← Назад
              </Button>
              <Button
                className="flex-1"
                onClick={() => void handleConnect()}
                disabled={teacherCode.trim().length < 3}
              >
                Подключиться
              </Button>
            </div>
          </>
        )}
      </motion.div>

      {packCount > 0 && step === "loading" && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-indigo-200 text-sm"
        >
          ✓ Загружено квизов: {packCount}
        </motion.p>
      )}
    </div>
  );
}
