import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { motion, AnimatePresence } from "framer-motion";
import type {
  Quiz,
  Question,
  QuizSession,
  SingleChoiceQuestion,
  MultipleChoiceQuestion,
  MatchingQuestion,
  OrderingQuestion,
  HotspotQuestion,
} from "@konstruktor/shared";
import { QuizEngine } from "@konstruktor/quiz-engine";
import {
  TimerBar,
  ProgressBar,
  StreakBadge,
  AnswerFeedback,
  Spinner,
} from "@konstruktor/ui";
import { saveSession } from "../services/db.ts";
import { syncPendingSessions } from "../services/sync.ts";
import {
  isMuted,
  toggleMute,
  playSelect,
  playCorrect,
  playWrong,
  playStreak,
  playTick,
  playCountdown,
  playFinishWin,
  playFinishLose,
} from "../services/sound.ts";

// Haptics helper — silent fail in web / unsupported platforms
async function haptic(style: ImpactStyle = ImpactStyle.Light): Promise<void> {
  try {
    await Haptics.impact({ style });
  } catch {
    /* not supported */
  }
}

// ── Framer Motion variants ──────────────────────────────────────────────────
const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const optionVariant = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 340, damping: 26 },
  },
};
const questionSlide = {
  initial: { opacity: 0, x: 60 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 280, damping: 28 },
  },
  exit: { opacity: 0, x: -60, transition: { duration: 0.18 } },
};
const countdownVariant = {
  initial: { scale: 0.3, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 400, damping: 20 },
  },
  exit: { scale: 1.8, opacity: 0, transition: { duration: 0.22 } },
};

export function QuizPage() {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [muted, setMutedState] = useState(isMuted());

  const engineRef = useRef<QuizEngine | null>(null);
  const [phase, setPhase] = useState<
    "countdown" | "question" | "feedback" | "finished"
  >("countdown");
  const [countdownNum, setCountdownNum] = useState<3 | 2 | 1>(3);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState("");
  const [lastCorrect, setLastCorrect] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // matching
  const [matchingMap, setMatchingMap] = useState<Record<string, string>>({});
  const [matchingActive, setMatchingActive] = useState<string | null>(null);
  const [matchingShuffledRights, setMatchingShuffledRights] = useState<
    string[]
  >([]);
  // ordering
  const [orderingItems, setOrderingItems] = useState<string[]>([]);
  // fill_blank
  const [fillBlankAnswers, setFillBlankAnswers] = useState<
    Record<string, string>
  >({});
  // hotspot
  const [hotspotClick, setHotspotClick] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const playerName = localStorage.getItem("player_name") ?? "Ученик";

  useEffect(() => {
    loadQuiz();
  }, [packId]);

  async function loadQuiz() {
    setLoading(true);
    try {
      const raw = await Filesystem.readFile({
        path: `packs/${packId}.pack/quiz.json`,
        directory: Directory.Data,
      });
      const loaded = JSON.parse(raw.data as string) as Quiz;
      setQuiz(loaded);
      const engine = new QuizEngine(loaded);
      engine.start(playerName);
      engineRef.current = engine;
      initQuestionState(engine.getCurrentQuestion() ?? undefined);
      // Countdown before first question
      setPhase("countdown");
      setCountdownNum(3);
      startCountdown(loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  function startCountdown(loadedQuiz: Quiz) {
    let count: 3 | 2 | 1 = 3;
    playCountdown(3);
    const interval = setInterval(() => {
      count = (count - 1) as 3 | 2 | 1;
      if (count >= 1) {
        setCountdownNum(count);
        playCountdown(count);
      }
      if (count <= 0) {
        clearInterval(interval);
        setPhase("question");
        setElapsed(0);
        const firstQ = engineRef.current?.getCurrentQuestion();
        startTimer(
          (firstQ?.timeLimit ?? loadedQuiz.settings.timePerQuestion ?? 30) *
            1000,
        );
      }
    }, 1000);
  }

  function initQuestionState(q: Question | undefined) {
    setSelectedId(null);
    setSelectedIds([]);
    setTextAnswer("");
    setMatchingMap({});
    setMatchingActive(null);
    setFillBlankAnswers({});
    setHotspotClick(null);
    if (q?.type === "ordering") {
      const oq = q as OrderingQuestion;
      setOrderingItems(
        [...oq.items.map((i) => i.id)].sort(() => Math.random() - 0.5),
      );
    } else if (q?.type === "matching") {
      const mq = q as MatchingQuestion;
      setMatchingShuffledRights(
        [...mq.pairs.map((p) => p.right)].sort(() => Math.random() - 0.5),
      );
    }
  }

  function startTimer(limit: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed((p) => {
        const next = p + 100;
        // Tick on each second of last 5 seconds
        const remaining = limit - next;
        if (remaining > 0 && remaining <= 5000) {
          const prevRemaining = limit - p;
          if (Math.floor(prevRemaining / 1000) > Math.floor(remaining / 1000)) {
            playTick();
          }
        }
        if (next >= limit) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setTimeout(() => {
            const eng = engineRef.current;
            if (eng && eng.getState() === "question") {
              eng.timeout();
              const answers = eng.getAnswers();
              const wasCorrect =
                answers[answers.length - 1]?.isCorrect ?? false;
              setLastCorrect(wasCorrect);
              setPhase("feedback");
              if (wasCorrect) {
                playCorrect();
                void haptic(ImpactStyle.Medium);
              } else {
                playWrong();
                void haptic(ImpactStyle.Light);
              }
            }
          }, 0);
        }
        return next;
      });
    }, 100);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => () => stopTimer(), []);

  // Selection handlers with sound + haptic
  function handleSelectOption(id: string) {
    if (phase !== "question") return;
    setSelectedId(id);
    playSelect();
    void haptic(ImpactStyle.Light);
  }

  function handleToggleMulti(id: string) {
    if (phase !== "question") return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    playSelect();
    void haptic(ImpactStyle.Light);
  }

  function submitAnswer() {
    const eng = engineRef.current;
    if (!eng) return;
    const currentQ = eng.getCurrentQuestion();
    if (!currentQ) return;
    stopTimer();

    if (currentQ.type === "single_choice") {
      if (!selectedId) return;
      eng.submitAnswer({ type: "single_choice", optionId: selectedId });
    } else if (currentQ.type === "multiple_choice") {
      if (selectedIds.length === 0) return;
      eng.submitAnswer({ type: "multiple_choice", optionIds: selectedIds });
    } else if (currentQ.type === "true_false") {
      if (!selectedId) return;
      eng.submitAnswer({ type: "true_false", value: selectedId === "true" });
    } else if (currentQ.type === "text_input") {
      if (!textAnswer.trim()) return;
      eng.submitAnswer({ type: "text_input", text: textAnswer.trim() });
    } else if (currentQ.type === "matching") {
      const mq = currentQ as MatchingQuestion;
      const pairs = mq.pairs.map((p) => ({
        leftId: p.id,
        rightId: matchingMap[p.id] ?? "",
      }));
      eng.submitAnswer({ type: "matching", pairs });
    } else if (currentQ.type === "ordering") {
      eng.submitAnswer({ type: "ordering", order: orderingItems });
    } else if (currentQ.type === "fill_blank") {
      eng.submitAnswer({ type: "fill_blank", answers: fillBlankAnswers });
    } else {
      eng.submitAnswer({ type: "timeout" });
    }

    const answers = eng.getAnswers();
    setLastCorrect(answers[answers.length - 1]?.isCorrect ?? false);
    setPhase("feedback");
  }

  function handleHotspotClick(x: number, y: number) {
    const eng = engineRef.current;
    if (!eng || phase !== "question") return;
    stopTimer();
    setHotspotClick({ x, y });
    eng.submitAnswer({ type: "hotspot", x, y });
    const answers = eng.getAnswers();
    setLastCorrect(answers[answers.length - 1]?.isCorrect ?? false);
    setPhase("feedback");
  }

  async function handleNext() {
    if (!engineRef.current || !quiz) return;
    engineRef.current.next();
    const engineState = engineRef.current.getState();
    if (engineState === "completed") {
      stopTimer();
      setPhase("finished");
      const engineResult = engineRef.current.getResult()!;
      const session: QuizSession = {
        id: crypto.randomUUID(),
        quizId: engineResult.quizId,
        quizVersion: engineResult.quizVersion,
        playerName: engineResult.playerName,
        startedAt: engineResult.startedAt,
        ...(engineResult.completedAt !== undefined && {
          completedAt: engineResult.completedAt,
        }),
        score: engineResult.score,
        totalPoints: engineResult.totalPoints,
        earnedPoints: engineResult.earnedPoints,
        ...(engineResult.isPassed !== undefined && {
          isPassed: engineResult.isPassed,
        }),
        streakData: engineResult.streakData,
        answers: engineResult.answers,
      };
      await saveSession(session);
      // Fire-and-forget sync — doesn't block navigation
      syncPendingSessions().catch(() => {});
      navigate(`/results/${session.id}`, { state: { session, quiz } });
    } else {
      setSelectedId(null);
      setSelectedIds([]);
      setTextAnswer("");
      setElapsed(0);
      const nextQ = engineRef.current.getCurrentQuestion() ?? undefined;
      initQuestionState(nextQ);
      startTimer(
        (nextQ?.timeLimit ?? quiz.settings.timePerQuestion ?? 30) * 1000,
      );
      setPhase("question");
    }
  }

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <Spinner size="lg" />
      </div>
    );
  if (error)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-red-400">
        {error}
      </div>
    );
  if (!quiz || !engineRef.current) return null;

  // ── Countdown screen ─────────────────────────────────────────────────────────────────
  if (phase === "countdown") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white">
        <p className="text-xl text-slate-400 mb-6 font-medium tracking-wide">
          {quiz.title}
        </p>
        <AnimatePresence mode="wait">
          <motion.div
            key={countdownNum}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              transition: { type: "spring", stiffness: 400, damping: 20 },
            }}
            exit={{ scale: 1.8, opacity: 0, transition: { duration: 0.22 } }}
            className="text-[140px] font-black leading-none select-none"
            style={{
              background: "linear-gradient(135deg, #818cf8, #a78bfa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {countdownNum}
          </motion.div>
        </AnimatePresence>
        <p className="text-slate-500 mt-4 text-sm tracking-widest uppercase">
          Приготовьтесь…
        </p>
      </div>
    );
  }

  const eng = engineRef.current;
  const currentQ = eng.getCurrentQuestion();
  const questionIndex = eng.getCurrentQuestionIndex();
  const streak = (() => {
    const answers = eng.getAnswers();
    let count = 0;
    for (let i = answers.length - 1; i >= 0 && answers[i]!.isCorrect; i--)
      count++;
    return count;
  })();
  const timeLimit =
    (currentQ?.timeLimit ?? quiz.settings.timePerQuestion ?? 30) * 1000;
  const isFeedback = phase === "feedback";

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-white">
      <header className="px-5 py-3 border-b border-slate-700 flex items-center gap-4">
        <button
          className="text-slate-400 hover:text-white flex-shrink-0"
          onClick={() => navigate("/home")}
          aria-label="На главную"
        >
          ←
        </button>
        <ProgressBar
          value={questionIndex / quiz.questions.length}
          colorClass="bg-indigo-500"
          className="flex-1"
        />
        <span className="text-sm text-slate-400 whitespace-nowrap flex-shrink-0">
          {questionIndex + 1} / {quiz.questions.length}
        </span>
        <button
          className="text-slate-400 hover:text-white flex-shrink-0 text-lg leading-none"
          onClick={() => {
            const m = toggleMute();
            setMutedState(m);
          }}
          aria-label={muted ? "Включить звук" : "Выключить звук"}
          title={muted ? "Включить звук" : "Выключить звук"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </header>

      <main className="flex-1 flex flex-col p-5 max-w-2xl mx-auto w-full">
        <TimerBar elapsedMs={elapsed} durationMs={timeLimit} className="mb-5" />

        {streak >= 2 && (
          <StreakBadge streak={streak} className="mb-4 self-start" />
        )}

        {currentQ && (
          <>
            <p className="text-xl font-semibold mb-6 leading-snug">
              {currentQ.text}
            </p>

            {currentQ.type === "single_choice" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(currentQ as SingleChoiceQuestion).options.map((opt) => (
                  <button
                    key={opt.id}
                    disabled={isFeedback}
                    className={`rounded-xl border-2 px-5 py-4 text-left font-medium transition-colors min-h-[56px] ${
                      selectedId === opt.id
                        ? "border-indigo-400 bg-indigo-900"
                        : "border-slate-600 bg-slate-800 hover:border-slate-400"
                    }`}
                    onClick={() => setSelectedId(opt.id)}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            )}

            {currentQ.type === "multiple_choice" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(currentQ as MultipleChoiceQuestion).options.map((opt) => {
                  const checked = selectedIds.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      disabled={isFeedback}
                      className={`rounded-xl border-2 px-5 py-4 text-left font-medium transition-colors min-h-[56px] ${
                        checked
                          ? "border-indigo-400 bg-indigo-900"
                          : "border-slate-600 bg-slate-800 hover:border-slate-400"
                      }`}
                      onClick={() =>
                        setSelectedIds((prev) =>
                          prev.includes(opt.id)
                            ? prev.filter((id) => id !== opt.id)
                            : [...prev, opt.id],
                        )
                      }
                    >
                      <span
                        className={`mr-2 inline-block h-4 w-4 rounded border-2 align-middle ${
                          checked
                            ? "border-indigo-400 bg-indigo-400"
                            : "border-slate-500"
                        }`}
                      />
                      {opt.text}
                    </button>
                  );
                })}
              </div>
            )}

            {/* true_false */}
            {currentQ.type === "true_false" && (
              <div className="flex gap-4">
                {(["true", "false"] as const).map((v) => (
                  <button
                    key={v}
                    disabled={isFeedback}
                    className={`flex-1 rounded-xl border-2 py-5 font-bold text-lg transition-colors min-h-[56px] ${
                      selectedId === v
                        ? "border-indigo-400 bg-indigo-900"
                        : "border-slate-600 bg-slate-800 hover:border-slate-400"
                    }`}
                    onClick={() => setSelectedId(v)}
                  >
                    {v === "true" ? "✔ Верно" : "✘ Неверно"}
                  </button>
                ))}
              </div>
            )}

            {/* text_input — скрыто (требует клавиатуры) */}

            {/* matching */}
            {currentQ.type === "matching" &&
              (() => {
                const mq = currentQ as MatchingQuestion;
                const allMapped = mq.pairs.every((p) => matchingMap[p.id]);
                return (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Левая часть
                        </p>
                        {mq.pairs.map((pair) => {
                          const isActive = matchingActive === pair.id;
                          const hasMatch = !!matchingMap[pair.id];
                          return (
                            <button
                              key={pair.id}
                              disabled={isFeedback}
                              onClick={() =>
                                setMatchingActive(isActive ? null : pair.id)
                              }
                              className={`rounded-xl border-2 px-4 py-3 text-left font-medium text-sm transition-colors min-h-[48px] ${
                                isActive
                                  ? "border-indigo-400 bg-indigo-900"
                                  : hasMatch
                                    ? "border-green-600 bg-green-900/30"
                                    : "border-slate-600 bg-slate-800"
                              }`}
                            >
                              <span>{pair.left}</span>
                              {matchingMap[pair.id] && (
                                <span className="block text-xs text-green-400 mt-0.5">
                                  → {matchingMap[pair.id]}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Правая часть
                        </p>
                        {matchingShuffledRights.map((rightText) => {
                          const isUsed =
                            Object.values(matchingMap).includes(rightText);
                          const isMappedToActive = matchingActive
                            ? matchingMap[matchingActive] === rightText
                            : false;
                          return (
                            <button
                              key={rightText}
                              disabled={
                                isFeedback ||
                                (!matchingActive && isUsed && !isMappedToActive)
                              }
                              onClick={() => {
                                if (!matchingActive) return;
                                setMatchingMap((prev) => ({
                                  ...prev,
                                  [matchingActive]: rightText,
                                }));
                                setMatchingActive(null);
                              }}
                              className={`rounded-xl border-2 px-4 py-3 text-left font-medium text-sm transition-colors min-h-[48px] ${
                                isMappedToActive
                                  ? "border-green-500 bg-green-900/30"
                                  : isUsed
                                    ? "border-slate-700 bg-slate-800/40 opacity-40"
                                    : matchingActive
                                      ? "border-indigo-500/50 bg-slate-800 hover:border-indigo-400"
                                      : "border-slate-600 bg-slate-800"
                              }`}
                            >
                              {rightText}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {!isFeedback && allMapped && (
                      <button
                        onClick={submitAnswer}
                        className="w-full rounded-xl bg-indigo-600 py-4 font-semibold text-white text-lg hover:bg-indigo-700 transition-colors min-h-[56px]"
                      >
                        Подтвердить соответствие
                      </button>
                    )}
                  </div>
                );
              })()}

            {/* ordering */}
            {currentQ.type === "ordering" &&
              (() => {
                const oq = currentQ as OrderingQuestion;
                const itemMap = new Map(oq.items.map((i) => [i.id, i]));
                return (
                  <div className="flex flex-col gap-3">
                    {orderingItems.map((itemId, idx) => {
                      const item = itemMap.get(itemId);
                      if (!item) return null;
                      return (
                        <div
                          key={itemId}
                          className="flex items-center gap-3 rounded-xl border-2 border-slate-600 bg-slate-800 px-4 py-3 min-h-[48px]"
                        >
                          <span className="text-slate-500 text-sm font-bold w-6 text-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="flex-1 font-medium">
                            {item.text}
                          </span>
                          {!isFeedback && (
                            <div className="flex flex-col gap-1 shrink-0">
                              <button
                                disabled={idx === 0}
                                onClick={() =>
                                  setOrderingItems((prev) => {
                                    const a = [...prev];
                                    [a[idx - 1], a[idx]] = [
                                      a[idx]!,
                                      a[idx - 1]!,
                                    ];
                                    return a;
                                  })
                                }
                                className="rounded bg-slate-700 px-2 py-0.5 text-xs disabled:opacity-20 hover:bg-slate-600"
                              >
                                ↑
                              </button>
                              <button
                                disabled={idx === orderingItems.length - 1}
                                onClick={() =>
                                  setOrderingItems((prev) => {
                                    const a = [...prev];
                                    [a[idx], a[idx + 1]] = [
                                      a[idx + 1]!,
                                      a[idx]!,
                                    ];
                                    return a;
                                  })
                                }
                                className="rounded bg-slate-700 px-2 py-0.5 text-xs disabled:opacity-20 hover:bg-slate-600"
                              >
                                ↓
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            {/* fill_blank — скрыто (требует клавиатуры) */}

            {/* hotspot */}
            {currentQ.type === "hotspot" &&
              (() => {
                const hq = currentQ as HotspotQuestion;
                return (
                  <div className="flex flex-col items-center gap-3">
                    {hq.imageUrl ? (
                      <>
                        <div
                          className="relative rounded-xl overflow-hidden border-2 border-slate-600 w-full"
                          style={{
                            cursor: isFeedback ? "default" : "crosshair",
                            userSelect: "none",
                          }}
                          onClick={(e) => {
                            if (isFeedback) return;
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            const x =
                              Math.round(
                                ((e.clientX - rect.left) / rect.width) * 1000,
                              ) / 10;
                            const y =
                              Math.round(
                                ((e.clientY - rect.top) / rect.height) * 1000,
                              ) / 10;
                            handleHotspotClick(x, y);
                          }}
                        >
                          <img
                            src={hq.imageUrl}
                            alt=""
                            className="block w-full pointer-events-none"
                            draggable={false}
                          />
                          {hotspotClick && (
                            <div
                              className="absolute rounded-full pointer-events-none"
                              style={{
                                left: `${hotspotClick.x}%`,
                                top: `${hotspotClick.y}%`,
                                transform: "translate(-50%,-50%)",
                                width: 28,
                                height: 28,
                                border: `3px solid ${isFeedback ? (lastCorrect ? "#22c55e" : "#ef4444") : "#818cf8"}`,
                                background: isFeedback
                                  ? lastCorrect
                                    ? "rgba(34,197,94,0.3)"
                                    : "rgba(239,68,68,0.3)"
                                  : "rgba(129,140,248,0.3)",
                              }}
                            />
                          )}
                          {isFeedback &&
                            hq.hotspots
                              .filter((h) => h.isCorrect)
                              .map((h) => (
                                <div
                                  key={h.id}
                                  className="absolute rounded-full pointer-events-none"
                                  style={{
                                    left: `${h.x}%`,
                                    top: `${h.y}%`,
                                    transform: "translate(-50%,-50%)",
                                    width: `${h.radius * 2}%`,
                                    aspectRatio: "1",
                                    border: "3px solid rgba(134,239,172,0.7)",
                                    background: "rgba(34,197,94,0.2)",
                                  }}
                                />
                              ))}
                        </div>
                        {!isFeedback && !hotspotClick && (
                          <p className="text-sm text-slate-400">
                            Нажмите на правильную точку
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-slate-400">Изображение не задано</p>
                    )}
                  </div>
                );
              })()}

            {isFeedback && (
              <AnswerFeedback
                correct={lastCorrect}
                {...(currentQ.explanation !== undefined && {
                  explanation: currentQ.explanation,
                })}
                className="mt-5"
              />
            )}

            {/* Submit / Next buttons */}
            <div className="mt-6">
              {phase === "question" &&
                currentQ.type !== "hotspot" &&
                currentQ.type !== "matching" && (
                  <button
                    disabled={
                      (currentQ.type === "single_choice" && !selectedId) ||
                      (currentQ.type === "true_false" && !selectedId) ||
                      (currentQ.type === "multiple_choice" &&
                        selectedIds.length === 0) ||
                      (currentQ.type === "ordering" &&
                        orderingItems.length === 0)
                    }
                    className="w-full rounded-xl bg-indigo-600 py-4 font-semibold text-white text-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all min-h-[56px] active:scale-[0.98]"
                    onClick={submitAnswer}
                  >
                    Ответить
                  </button>
                )}
              {phase === "feedback" && (
                <button
                  className="w-full rounded-xl bg-indigo-600 py-4 font-semibold text-white text-lg hover:bg-indigo-700 transition-all min-h-[56px] active:scale-[0.98]"
                  onClick={() => void handleNext()}
                >
                  {questionIndex + 1 >= quiz.questions.length
                    ? "Завершить 🏁"
                    : "Следующий →"}
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
