import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { AnimatePresence, motion } from "framer-motion";
import type { Quiz } from "@konstruktor/shared";
import { Button, Badge, Spinner } from "@konstruktor/ui";
import { useTour } from "../context/TourContext.tsx";
import { useToast } from "../context/ToastContext.tsx";
import { useDemo } from "../context/DemoContext.tsx";

const SUGGESTIONS = [
  "11 кл, Биология, Молекулярная биология",
  "7 кл, Физика, Сила тяжести",
  "5 кл, Литература, Пушкин",
  "9 кл, История, СССР",
  "6 кл, Биология, Клетка",
];

type LeaderboardSession = {
  id: string;
  playerName: string;
  score: number | null;
  earnedPoints: number;
  totalPoints: number;
  isPassed: boolean | null;
};

const PODIUM_EMOJIS = ["🦊", "🐸", "🐻", "🐱", "🐺", "🦋", "🐧", "🦁"];
const PODIUM_BG = [
  "from-orange-400 to-red-500",
  "from-emerald-400 to-green-600",
  "from-amber-500 to-orange-700",
  "from-slate-300 to-slate-500",
  "from-indigo-300 to-slate-500",
  "from-pink-400 to-violet-500",
  "from-cyan-400 to-blue-600",
  "from-yellow-300 to-amber-500",
];

function nameToAvatarIdx(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) & 0xff;
  return h % 8;
}

const SUBJECT_COLORS: Record<string, string> = {
  История: "from-amber-700 to-orange-900",
  Математика: "from-blue-700 to-indigo-900",
  Биология: "from-emerald-700 to-green-900",
  Физика: "from-violet-700 to-purple-900",
  Химия: "from-fuchsia-700 to-pink-900",
  География: "from-teal-700 to-cyan-900",
  Литература: "from-rose-700 to-red-900",
};
const DEFAULT_COLORS = "from-indigo-700 to-slate-900";

function isNew(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000;
}

function pluralQ(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return "вопрос";
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100))
    return "вопроса";
  return "вопросов";
}

export function DashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { startTour } = useTour();
  const { startDemo } = useDemo();
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(
    () => !localStorage.getItem("konstruktor_welcomed"),
  );
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [heroTopic, setHeroTopic] = useState("");
  const [heroGrade, setHeroGrade] = useState("");
  const [heroCount, setHeroCount] = useState(5);
  const [leaderOpen, setLeaderOpen] = useState(false);
  const [leaderLoading, setLeaderLoading] = useState(false);
  const [leaderData, setLeaderData] = useState<LeaderboardSession[]>([]);
  const [leaderTitle, setLeaderTitle] = useState("");

  function dismissWelcome() {
    localStorage.setItem("konstruktor_welcomed", "1");
    setWelcomeOpen(false);
  }

  const { data: quizzes = [], isLoading } = useQuery<Quiz[]>({
    queryKey: ["quizzes"],
    queryFn: () => invoke<Quiz[]>("list_quizzes"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invoke("delete_quiz", { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quizzes"] });
      showToast("Квиз удалён", "success");
    },
    onError: (e: unknown) =>
      showToast(e instanceof Error ? e.message : "Ошибка удаления", "error"),
  });

  const [publishingId, setPublishingId] = useState<string | null>(null);

  async function handlePublish(quiz: Quiz, e: React.MouseEvent) {
    e.stopPropagation();
    const apiUrl = localStorage.getItem("api_url");
    if (!apiUrl) {
      showToast("Укажите URL API в настройках", "error");
      return;
    }
    setPublishingId(quiz.id);
    try {
      // Sync full quiz data, then mark published
      const token = localStorage.getItem("api_token") ?? "";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      // Upsert quiz data
      await fetch(`${apiUrl}/quizzes/${quiz.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(quiz),
      });
      // Publish
      const res = await fetch(`${apiUrl}/quizzes/${quiz.id}/publish`, {
        method: "POST",
        headers,
      });
      if (!res.ok) throw new Error(await res.text());
      qc.invalidateQueries({ queryKey: ["quizzes"] });
      showToast("Квиз опубликован", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setPublishingId(null);
    }
  }

  async function handleLeaderboard(
    quizId: string,
    quizTitle: string,
    e: React.MouseEvent,
  ) {
    e.stopPropagation();
    const apiUrl = localStorage.getItem("api_url");
    if (!apiUrl) {
      showToast("Укажите URL API в настройках", "error");
      return;
    }
    setLeaderTitle(quizTitle);
    setLeaderData([]);
    setLeaderOpen(true);
    setLeaderLoading(true);
    try {
      const token = localStorage.getItem("api_token") ?? "";
      const res = await fetch(`${apiUrl}/quizzes/${quizId}/sessions`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { sessions: LeaderboardSession[] };
      const sorted = [...json.sessions].sort(
        (a, b) => b.earnedPoints - a.earnedPoints,
      );
      setLeaderData(sorted);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Ошибка загрузки",
        "error",
      );
      setLeaderOpen(false);
    } finally {
      setLeaderLoading(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    setCreateModalOpen(false);
    try {
      const id = await invoke<string>("create_quiz");
      navigate(`/editor/${id}`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Ошибка создания", "error");
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setCreateModalOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  async function handleCreateAI() {
    if (!heroTopic.trim()) return;
    setCreating(true);
    dismissWelcome();
    setCreateModalOpen(false);
    try {
      const id = await invoke<string>("create_quiz");
      const params = new URLSearchParams();
      params.set("aiTopic", heroTopic.trim());
      if (heroGrade.trim()) params.set("aiGrade", heroGrade.trim());
      params.set("aiCount", String(heroCount));
      navigate(`/editor/${id}?${params.toString()}`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Ошибка создания", "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <h1
            className="text-xl font-bold text-slate-800"
            data-tour="header-title"
          >
            Мои квизы
          </h1>
          <div className="flex gap-2">
            <button
              data-tour="nav-settings"
              className="text-sm text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              onClick={() => navigate("/settings")}
            >
              ⚙️ Настройки
            </button>
            <Button
              variant="secondary"
              onClick={startDemo}
              data-tour="demo-btn"
            >
              🎬 Демо
            </Button>
            <Button
              variant="secondary"
              onClick={startTour}
              data-tour="tour-btn"
            >
              🎓 Обучение
            </Button>
            <Button
              onClick={() => {
                dismissWelcome();
                setCreateModalOpen(true);
              }}
              data-tour="new-quiz"
            >
              + Новый квиз
            </Button>
          </div>
        </header>

        <main className="p-8">
          {isLoading && (
            <div className="flex justify-center py-24">
              <Spinner size="lg" />
            </div>
          )}

          {!isLoading && quizzes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <p className="text-lg">Квизов пока нет.</p>
              <p className="text-sm mt-1">
                Нажмите «+ Новый квиз» чтобы начать.
              </p>
            </div>
          )}

          {!isLoading && quizzes.length > 0 && (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.06 } },
                hidden: {},
              }}
            >
              {quizzes.map((quiz, idx) => {
                const gradColors =
                  SUBJECT_COLORS[quiz.subject ?? ""] ?? DEFAULT_COLORS;
                const qCount = quiz.questions?.length ?? 0;
                const fresh = isNew(quiz.createdAt);
                const status =
                  (quiz as Quiz & { status?: string }).status ?? "draft";
                return (
                  <motion.div
                    key={quiz.id}
                    variants={{
                      hidden: { opacity: 0, y: 16 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.3 },
                      },
                    }}
                    {...(idx === 0 ? { "data-tour": "quiz-card" } : {})}
                    className="group relative bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden cursor-pointer border border-slate-100"
                    onClick={() => navigate(`/editor/${quiz.id}`)}
                  >
                    {/* Gradient thumbnail */}
                    <div
                      className={`h-20 bg-gradient-to-br ${gradColors} flex items-end px-4 pb-3 relative`}
                    >
                      {fresh && (
                        <span className="absolute top-2 right-2 bg-emerald-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          НОВЫЙ
                        </span>
                      )}
                      <span className="text-white/70 text-xs font-medium">
                        {quiz.subject ?? "Предмет не указан"}
                        {quiz.gradeLevel ? ` · ${quiz.gradeLevel} кл` : ""}
                      </span>
                    </div>

                    {/* Body */}
                    <div className="px-4 pt-3 pb-2">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2 flex-1">
                          {quiz.title || "Без названия"}
                        </p>
                        {status === "published" ? (
                          <Badge variant="success" className="shrink-0">
                            Опубл.
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="shrink-0">
                            Черн.
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mb-3">
                        {qCount} {pluralQ(qCount)}
                      </p>
                    </div>

                    {/* Footer actions */}
                    <div className="border-t border-slate-100 px-3 py-2 flex gap-1.5 flex-wrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-xs"
                        {...(idx === 0 ? { "data-tour": "preview-btn" } : {})}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/preview/${quiz.id}`);
                        }}
                      >
                        ▶ Превью
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-xs"
                        loading={publishingId === quiz.id}
                        onClick={(e) => void handlePublish(quiz, e)}
                      >
                        {status === "published" ? "☁ Обн." : "☁ Опубл."}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-xs"
                        title="Показать рейтинг"
                        onClick={(e) =>
                          void handleLeaderboard(quiz.id, quiz.title, e)
                        }
                      >
                        🏆
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        className="text-xs ml-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Удалить этот квиз?"))
                            deleteMutation.mutate(quiz.id);
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </main>
      </div>
      {/* ── Welcome overlay ──────────────────────────────────────────── */}
      <AnimatePresence>
        {welcomeOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-6"
            onClick={dismissWelcome}
          >
            <motion.div
              initial={{ scale: 0.9, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 24, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-3xl font-bold text-slate-800 mb-2">
                Привет! 👋
              </h2>
              <p className="text-slate-500 mb-8">
                Создайте первый квиз за 60 секунд или попробуйте готовый
                демо-квиз.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => {
                    dismissWelcome();
                    setCreateModalOpen(true);
                  }}
                  className="relative rounded-2xl p-6 text-left overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 text-white hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  <div className="text-3xl mb-3">✨</div>
                  <p className="font-bold text-lg leading-tight">
                    Создать с ИИ
                  </p>
                  <p className="text-indigo-200 text-sm mt-1">
                    Введите тему — ИИ сделает квиз сам
                  </p>
                </button>
                <button
                  onClick={() => {
                    dismissWelcome();
                    if (quizzes.length > 0)
                      navigate(`/preview/${quizzes[0]!.id}`);
                  }}
                  className="rounded-2xl p-6 text-left border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 active:scale-[0.98] transition-all"
                >
                  <div className="text-3xl mb-3">📦</div>
                  <p className="font-bold text-lg text-slate-800 leading-tight">
                    Демо-квиз
                  </p>
                  <p className="text-slate-400 text-sm mt-1">
                    История России — попробуйте сами
                  </p>
                </button>
              </div>
              <button
                onClick={dismissWelcome}
                className="text-sm text-slate-400 hover:text-slate-600 w-full text-center transition-colors"
              >
                Пропустить
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── Create quiz modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {createModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6"
            onClick={() => setCreateModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* AI hero section */}
              <div className="bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 p-8 text-white">
                <div className="text-4xl mb-3">✨</div>
                <h2 className="text-2xl font-bold mb-1">Создать квиз с ИИ</h2>
                <p className="text-indigo-200 text-sm">
                  ИИ сгенерирует вопросы, варианты ответов и объяснения
                  автоматически
                </p>

                <div className="mt-5 flex flex-col gap-3">
                  <input
                    autoFocus
                    data-demo="topic-input"
                    value={heroTopic}
                    onChange={(e) => setHeroTopic(e.target.value)}
                    placeholder="О чём квиз? Например: Физика, сила тяжести"
                    className="w-full rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 text-base outline-none focus:ring-2 focus:ring-white/60"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && heroTopic.trim())
                        void handleCreateAI();
                    }}
                  />
                  {/* Smart suggestions */}
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setHeroTopic(s);
                          const gradeMatch = s.match(/^(\d+)\s*кл/i);
                          if (gradeMatch?.[1]) setHeroGrade(gradeMatch[1]);
                        }}
                        className="text-xs bg-white/20 hover:bg-white/30 text-white rounded-full px-3 py-1 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3 items-center">
                    <input
                      value={heroGrade}
                      onChange={(e) => setHeroGrade(e.target.value)}
                      placeholder="Класс (напр. 7)"
                      className="flex-1 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 text-sm outline-none focus:ring-2 focus:ring-white/60"
                    />
                    <div className="flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2.5">
                      <span className="text-sm text-white/80">Вопросов:</span>
                      <select
                        value={heroCount}
                        onChange={(e) => setHeroCount(Number(e.target.value))}
                        className="bg-transparent text-sm outline-none text-white"
                      >
                        {[3, 5, 8, 10, 15].map((n) => (
                          <option key={n} value={n} className="text-slate-800">
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => void handleCreateAI()}
                  data-demo="ai-submit"
                  disabled={creating || !heroTopic.trim()}
                  className="mt-5 w-full bg-white text-indigo-600 font-bold rounded-xl py-3 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? "Создание…" : "✨ Создать квиз с ИИ"}
                </button>
              </div>

              {/* Manual fallback */}
              <div className="px-8 py-5 flex items-center justify-between">
                <p className="text-sm text-slate-400">Или создайте вручную</p>
                <button
                  data-demo="manual-create"
                  onClick={() => void handleCreate()}
                  disabled={creating}
                  className="text-sm text-indigo-600 font-medium hover:underline disabled:opacity-50"
                >
                  Создать пустой квиз →
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── Leaderboard Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {leaderOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6"
            onClick={() => setLeaderOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 32, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 32, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-8 pt-7 pb-4 text-center">
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">
                  Рейтинг класса
                </p>
                <h2 className="text-2xl font-bold text-white leading-tight line-clamp-1">
                  {leaderTitle}
                </h2>
              </div>

              {leaderLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-600 border-t-indigo-400" />
                </div>
              ) : leaderData.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <p className="text-4xl mb-3">🏜️</p>
                  <p>Пока нет результатов</p>
                </div>
              ) : (
                <div className="px-6 pb-8">
                  {/* Podium: show top 3 */}
                  <div className="flex items-end justify-center gap-3 mb-6 h-40">
                    {[leaderData[1], leaderData[0], leaderData[2]].map(
                      (s, podiumIdx) => {
                        if (!s)
                          return <div key={podiumIdx} className="flex-1" />;
                        const rank =
                          podiumIdx === 1 ? 1 : podiumIdx === 0 ? 2 : 3;
                        const heights = ["h-24", "h-36", "h-20"];
                        const crowns = ["🥈", "🥇", "🥉"];
                        const idx = nameToAvatarIdx(s.playerName);
                        return (
                          <motion.div
                            key={s.id}
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: (3 - rank) * 0.18,
                              duration: 0.5,
                              type: "spring",
                            }}
                            className={`flex-1 flex flex-col items-center`}
                          >
                            <span className="text-xl mb-1">
                              {crowns[podiumIdx]}
                            </span>
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${PODIUM_BG[idx]} text-xl shadow-lg mb-1`}
                            >
                              {PODIUM_EMOJIS[idx]}
                            </div>
                            <p className="text-white text-xs font-semibold text-center leading-tight line-clamp-1 mb-1 max-w-[80px]">
                              {s.playerName}
                            </p>
                            <p className="text-indigo-300 text-xs font-mono mb-2">
                              {s.earnedPoints} бал.
                            </p>
                            <div
                              className={`w-full ${heights[podiumIdx]} rounded-t-xl flex items-start justify-center pt-2 ${rank === 1 ? "bg-amber-500/30 border-t-2 border-amber-400" : rank === 2 ? "bg-slate-600/50 border-t-2 border-slate-400" : "bg-orange-900/40 border-t-2 border-orange-700"}`}
                            >
                              <span className="text-lg font-black text-white/60">
                                #{rank}
                              </span>
                            </div>
                          </motion.div>
                        );
                      },
                    )}
                  </div>

                  {/* Rest of participants */}
                  {leaderData.slice(3).length > 0 && (
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                      {leaderData.slice(3).map((s, i) => {
                        const idx = nameToAvatarIdx(s.playerName);
                        return (
                          <motion.div
                            key={s.id}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 + i * 0.05 }}
                            className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-2.5"
                          >
                            <span className="text-slate-500 text-sm w-5 text-right font-mono">
                              #{i + 4}
                            </span>
                            <span
                              className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${PODIUM_BG[idx]} text-base shrink-0`}
                            >
                              {PODIUM_EMOJIS[idx]}
                            </span>
                            <span className="text-white text-sm flex-1 truncate">
                              {s.playerName}
                            </span>
                            <span className="text-slate-400 text-xs font-mono">
                              {s.earnedPoints} бал.
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="px-6 pb-6 flex justify-center">
                <Button
                  variant="secondary"
                  onClick={() => setLeaderOpen(false)}
                >
                  Закрыть
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
