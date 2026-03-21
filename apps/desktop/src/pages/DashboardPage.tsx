import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { AnimatePresence, motion } from "framer-motion";
import {
  MagnifyingGlass,
  Bell,
  MagicWand,
  PaperPlaneTilt,
  FileArrowUp,
  FolderStar,
  ListNumbers,
  PencilSimple,
  CaretRight,
  Trophy,
} from "@phosphor-icons/react";
import type { Quiz } from "@konstruktor/shared";
import { Button, Spinner } from "@konstruktor/ui";
import { useTour } from "../context/TourContext.tsx";
import { useToast } from "../context/ToastContext.tsx";
import { useDemo } from "../context/DemoContext.tsx";
import { Sidebar } from "../components/Sidebar.tsx";

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

// Pill-цвета для новых карточек
const SUBJECT_PILL: Record<
  string,
  { bg: string; text: string; emoji: string }
> = {
  История: { bg: "bg-amber-50", text: "text-amber-700", emoji: "📜" },
  Математика: { bg: "bg-sky-50", text: "text-sky-600", emoji: "📐" },
  Биология: { bg: "bg-emerald-50", text: "text-emerald-700", emoji: "🌿" },
  Физика: { bg: "bg-violet-50", text: "text-violet-600", emoji: "⚡" },
  Химия: { bg: "bg-fuchsia-50", text: "text-fuchsia-600", emoji: "🧪" },
  География: { bg: "bg-teal-50", text: "text-teal-600", emoji: "🌍" },
  Литература: { bg: "bg-orange-50", text: "text-orange-600", emoji: "📚" },
};
const DEFAULT_PILL = {
  bg: "bg-slate-100",
  text: "text-slate-600",
  emoji: "📝",
};

function pluralQ(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return "вопрос";
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100))
    return "вопроса";
  return "вопросов";
}

export function DashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  useTour(); // сохраняем контекст для AppTour
  useDemo(); // сохраняем контекст для DemoRunner
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterGrade, setFilterGrade] = useState("");

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

  // Уникальные предметы и классы для фильтров
  const allSubjects = useMemo(
    () => [...new Set(quizzes.map((q) => q.subject).filter(Boolean))],
    [quizzes],
  );
  const allGrades = useMemo(
    () => [...new Set(quizzes.map((q) => q.gradeLevel).filter(Boolean))].sort(),
    [quizzes],
  );

  // Отфильтрованные квизы
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      if (filterSubject && q.subject !== filterSubject) return false;
      if (filterGrade && q.gradeLevel !== filterGrade) return false;
      if (
        searchQuery &&
        !q.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(q.subject ?? "").toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });
  }, [quizzes, filterSubject, filterGrade, searchQuery]);

  return (
    <>
      {/* ── Основной layout ─────────────────────────────────────────── */}
      <div className="flex h-screen overflow-hidden bg-[#FAFAFA] text-slate-800 antialiased">
        <Sidebar activePage="dashboard" />

        <main className="flex-1 flex flex-col min-w-0">
          {/* Верхняя панель */}
          <header className="h-18 px-8 flex items-center justify-between z-10 sticky top-0 bg-[#FAFAFA]/80 backdrop-blur-xl border-b border-slate-200/50 shrink-0">
            <div className="flex items-center gap-2 text-[15px] font-bold text-slate-800">
              <span className="text-slate-400">Рабочее пространство</span>
              <CaretRight size={12} weight="bold" className="text-slate-300" />
              <span>Мои квизы</span>
            </div>

            <div className="flex items-center gap-5">
              {/* Поиск */}
              <div className="relative w-64 lg:w-80 group hidden sm:block">
                <MagnifyingGlass
                  size={16}
                  weight="bold"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Найти квиз или тему..."
                  className="w-full bg-white border border-slate-200 focus:bg-white focus:border-primary-300 focus:ring-4 focus:ring-primary-50 rounded-full py-2.5 pl-10 pr-4 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 shadow-sm"
                />
              </div>
              {/* Колокол */}
              <button
                className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-primary-600 hover:border-primary-200 transition-all shadow-sm"
                onClick={() => showToast("Уведомлений пока нет", "info")}
              >
                <Bell size={20} weight="fill" />
              </button>
            </div>
          </header>

          {/* Скроллируемый контент */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto p-8 flex flex-col gap-8">
              {/* ── Верхний блок: AI-баннер + Быстрый старт ────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* AI-баннер */}
                <div
                  className="lg:col-span-2 rounded-[28px] p-8 flex flex-col justify-center border border-white shadow-soft relative overflow-hidden"
                  style={{
                    background:
                      "linear-gradient(135deg, #F3E8FF 0%, #FFE4E6 50%, #E0E7FF 100%)",
                  }}
                >
                  {/* Блик */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 60%)",
                    }}
                  />
                  <div className="relative z-10 flex items-start gap-6">
                    <div className="w-16 h-16 rounded-[20px] bg-white/60 backdrop-blur-sm flex items-center justify-center text-primary-600 shrink-0 shadow-sm border border-white/80">
                      <MagicWand size={32} weight="duotone" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-2xl font-extrabold text-slate-800 mb-1.5">
                        Что создадим сегодня? ✨
                      </h2>
                      <p className="text-slate-600 text-[15px] font-medium mb-5">
                        Напишите тему урока, а ИИ соберёт из этого готовый квиз.
                      </p>
                      <div className="relative flex items-center bg-white rounded-2xl p-1.5 shadow-input border border-primary-100 focus-within:ring-4 focus-within:ring-primary-50 transition-all">
                        <input
                          type="text"
                          value={heroTopic}
                          onChange={(e) => setHeroTopic(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && heroTopic.trim())
                              void handleCreateAI();
                          }}
                          placeholder="Например: Тест на 10 вопросов по строению цветка..."
                          className="w-full bg-transparent text-slate-800 placeholder:text-slate-400 text-[15px] font-semibold px-4 py-3 outline-none"
                        />
                        <button
                          onClick={() => void handleCreateAI()}
                          disabled={creating || !heroTopic.trim()}
                          className="absolute right-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[15px] px-6 py-2.5 rounded-xl transition-transform active:scale-95 shadow-md flex items-center gap-2"
                        >
                          {creating ? "..." : "Придумать"}
                          <PaperPlaneTilt size={16} weight="bold" />
                        </button>
                      </div>
                      {/* Подсказки */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {SUGGESTIONS.slice(0, 3).map((s) => (
                          <button
                            key={s}
                            onClick={() => setHeroTopic(s)}
                            className="text-xs bg-white/60 hover:bg-white/90 text-slate-600 font-semibold rounded-full px-3 py-1 transition-colors border border-white/80"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Быстрый старт */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-card p-6 flex flex-col justify-center gap-4">
                  <h3 className="font-extrabold text-slate-800 text-[17px] mb-1">
                    Быстрый старт
                  </h3>

                  <button
                    className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 text-left group"
                    onClick={async () => {
                      try {
                        await openFileDialog({ multiple: false });
                        showToast(
                          "Файл выбран — импорт скоро будет готов",
                          "info",
                        );
                      } catch {
                        // cancelled
                      }
                    }}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <FileArrowUp size={24} weight="duotone" />
                    </div>
                    <div>
                      <div className="text-[15px] font-bold text-slate-800 group-hover:text-orange-600 transition-colors">
                        Загрузить файл
                      </div>
                      <div className="text-xs font-semibold text-slate-500 mt-0.5">
                        Сделать тест из Word/PDF
                      </div>
                    </div>
                  </button>

                  <button
                    className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 text-left group"
                    onClick={() => showToast("Шаблоны — скоро!", "info")}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <FolderStar size={24} weight="duotone" />
                    </div>
                    <div>
                      <div className="text-[15px] font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                        Взять шаблон
                      </div>
                      <div className="text-xs font-semibold text-slate-500 mt-0.5">
                        Готовые по школьной программе
                      </div>
                    </div>
                  </button>

                  <button
                    className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 text-left group"
                    onClick={() => {
                      dismissWelcome();
                      setCreateModalOpen(true);
                    }}
                    data-tour="new-quiz"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center group-hover:scale-105 transition-transform text-2xl font-bold">
                      +
                    </div>
                    <div>
                      <div className="text-[15px] font-bold text-slate-800 group-hover:text-primary-600 transition-colors">
                        Пустой квиз
                      </div>
                      <div className="text-xs font-semibold text-slate-500 mt-0.5">
                        Добавить всё вручную
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* ── Список квизов ───────────────────────────────────── */}
              <div>
                {/* Заголовок + фильтры */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-6">
                  <h1 className="text-[22px] font-extrabold text-slate-800 flex items-center gap-3">
                    Ваши материалы
                    <span className="px-3 py-1 rounded-xl bg-primary-50 text-primary-600 text-sm font-bold">
                      {quizzes.length}
                    </span>
                  </h1>
                  <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0">
                    {/* Фильтр предметов */}
                    <select
                      value={filterSubject}
                      onChange={(e) => setFilterSubject(e.target.value)}
                      className="px-4 py-2.5 rounded-full bg-white border border-slate-200 text-slate-600 font-bold text-sm shadow-sm hover:border-primary-300 focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-50 transition-all appearance-none cursor-pointer whitespace-nowrap"
                    >
                      <option value="">Все предметы</option>
                      {allSubjects.map((s) => (
                        <option key={s} value={s as string}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {/* Фильтр класса */}
                    <select
                      value={filterGrade}
                      onChange={(e) => setFilterGrade(e.target.value)}
                      className="px-4 py-2.5 rounded-full bg-white border border-slate-200 text-slate-600 font-bold text-sm shadow-sm hover:border-primary-300 focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-50 transition-all appearance-none cursor-pointer whitespace-nowrap"
                    >
                      <option value="">Любой класс</option>
                      {allGrades.map((g) => (
                        <option key={g} value={g as string}>
                          {g} кл
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Загрузка */}
                {isLoading && (
                  <div className="flex justify-center py-24">
                    <Spinner size="lg" />
                  </div>
                )}

                {/* Пусто */}
                {!isLoading && quizzes.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                    <p className="text-lg font-semibold">Квизов пока нет.</p>
                    <p className="text-sm mt-1">
                      Введите тему выше или создайте пустой квиз.
                    </p>
                  </div>
                )}

                {/* Сетка карточек */}
                {!isLoading && (
                  <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: { transition: { staggerChildren: 0.06 } },
                      hidden: {},
                    }}
                  >
                    {filteredQuizzes.map((quiz, idx) => {
                      const pill =
                        SUBJECT_PILL[quiz.subject ?? ""] ?? DEFAULT_PILL;
                      const qCount = quiz.questions?.length ?? 0;
                      const status =
                        (quiz as Quiz & { status?: string }).status ?? "draft";
                      const isPublished = status === "published";
                      return (
                        <motion.div
                          key={quiz.id}
                          variants={{
                            hidden: { opacity: 0, y: 16 },
                            visible: {
                              opacity: 1,
                              y: 0,
                              transition: { duration: 0.28 },
                            },
                          }}
                          {...(idx === 0 ? { "data-tour": "quiz-card" } : {})}
                          className="group bg-white rounded-[20px] border border-slate-100 shadow-card hover:-translate-y-1 hover:shadow-[0_12px_30px_-8px_rgba(139,92,246,0.12)] hover:border-primary-100 transition-all duration-300 cursor-pointer flex flex-col min-h-60 p-6"
                          onClick={() => navigate(`/editor/${quiz.id}`)}
                        >
                          {/* Шапка: предмет + класс */}
                          <div className="flex justify-between items-start mb-4">
                            <span
                              className={`${pill.bg} ${pill.text} px-3 py-1.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5`}
                            >
                              {pill.emoji} {quiz.subject ?? "Без предмета"}
                            </span>
                            {quiz.gradeLevel && (
                              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-xl">
                                {quiz.gradeLevel} класс
                              </span>
                            )}
                          </div>

                          {/* Название */}
                          <h3 className="text-[18px] font-extrabold text-slate-800 leading-snug mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                            {quiz.title || "Без названия"}
                          </h3>

                          {/* Футер */}
                          <div className="mt-auto pt-4 flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                              <span className="text-[13px] font-bold text-slate-600 flex items-center gap-1.5">
                                <ListNumbers
                                  size={14}
                                  className="text-slate-400"
                                />
                                {qCount} {pluralQ(qCount)}
                              </span>
                              {isPublished ? (
                                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                                  Опубликован
                                </span>
                              ) : (
                                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />
                                  Черновик
                                </span>
                              )}
                            </div>

                            {/* Hover-действия */}
                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                              <button
                                {...(idx === 0
                                  ? { "data-tour": "preview-btn" }
                                  : {})}
                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-primary-100 hover:text-primary-600 transition-colors"
                                title="Превью"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/preview/${quiz.id}`);
                                }}
                              >
                                ▶
                              </button>
                              <button
                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-primary-100 hover:text-primary-600 transition-colors"
                                title="Редактировать"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/editor/${quiz.id}`);
                                }}
                              >
                                <PencilSimple size={16} />
                              </button>
                              <button
                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-sky-100 hover:text-sky-600 transition-colors"
                                title="Рейтинг"
                                onClick={(e) =>
                                  void handleLeaderboard(quiz.id, quiz.title, e)
                                }
                              >
                                <Trophy size={16} />
                              </button>
                              <button
                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                                title={
                                  isPublished ? "Обновить" : "Опубликовать"
                                }
                                disabled={publishingId === quiz.id}
                                onClick={(e) => void handlePublish(quiz, e)}
                              >
                                ☁
                              </button>
                              <button
                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-500 transition-colors"
                                title="Удалить"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm("Удалить этот квиз?"))
                                    deleteMutation.mutate(quiz.id);
                                }}
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            </div>
          </div>
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
                  className="relative rounded-2xl p-6 text-left overflow-hidden bg-linear-to-br from-indigo-500 to-violet-600 text-white hover:scale-[1.02] active:scale-[0.98] transition-transform"
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
              <div className="bg-linear-to-br from-indigo-500 via-violet-500 to-purple-600 p-8 text-white">
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
                              className={`flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br ${PODIUM_BG[idx]} text-xl shadow-lg mb-1`}
                            >
                              {PODIUM_EMOJIS[idx]}
                            </div>
                            <p className="text-white text-xs font-semibold text-center leading-tight line-clamp-1 mb-1 max-w-20">
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
                              className={`flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br ${PODIUM_BG[idx]} text-base shrink-0`}
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
