import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type {
  Quiz,
  Question,
  SingleChoiceQuestion,
  MultipleChoiceQuestion,
  TextInputQuestion,
  MatchingQuestion,
  OrderingQuestion,
  FillBlankQuestion,
  HotspotQuestion,
} from "@konstruktor/shared";
import { QuizEngine } from "@konstruktor/quiz-engine";
import { Spinner } from "@konstruktor/ui";

type QuizWithBg = Quiz & { backgroundUrl?: string };

// ── colours matching Kahoot palette but with gradients ─────────────────────
const TILE_COLORS = [
  {
    bg: "linear-gradient(145deg,#e21b3c 0%,#c01535 100%)",
    glow: "rgba(226,27,60,0.55)",
  },
  {
    bg: "linear-gradient(145deg,#1368ce 0%,#0d52a8 100%)",
    glow: "rgba(19,104,206,0.55)",
  },
  {
    bg: "linear-gradient(145deg,#d89e00 0%,#b07e00 100%)",
    glow: "rgba(216,158,0,0.55)",
  },
  {
    bg: "linear-gradient(145deg,#26890c 0%,#1c6b09 100%)",
    glow: "rgba(38,137,12,0.55)",
  },
  {
    bg: "linear-gradient(145deg,#8b21b5 0%,#6f1990 100%)",
    glow: "rgba(139,33,181,0.55)",
  },
  {
    bg: "linear-gradient(145deg,#e04a8e 0%,#be3a74 100%)",
    glow: "rgba(224,74,142,0.55)",
  },
];
const LETTERS = ["A", "B", "C", "D", "E", "F"];

const SUBJECT_GRADIENTS: Record<string, string> = {
  История:
    "radial-gradient(ellipse at 65% 25%, #3d1c0e 0%, #1e0c20 45%, #070210 100%)",
  Математика:
    "radial-gradient(ellipse at 35% 70%, #061224 0%, #0a1d3d 55%, #030d1a 100%)",
  Биология:
    "radial-gradient(ellipse at 50% 40%, #0a1e0d 0%, #071508 60%, #030a05 100%)",
  Физика:
    "radial-gradient(ellipse at 65% 20%, #06061e 0%, #090930 60%, #030310 100%)",
  Химия:
    "radial-gradient(ellipse at 40% 60%, #1b0625 0%, #120417 60%, #060209 100%)",
  География:
    "radial-gradient(ellipse at 50% 50%, #051820 0%, #082030 60%, #020c14 100%)",
  Литература:
    "radial-gradient(ellipse at 30% 40%, #1a1005 0%, #120b03 60%, #080503 100%)",
};
const DEFAULT_GRADIENT =
  "radial-gradient(ellipse at 50% 25%, #1a0533 0%, #0e0921 50%, #040310 100%)";

function pluralQ(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return "вопрос";
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100))
    return "вопроса";
  return "вопросов";
}

export function PreviewPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [bgDataUrl, setBgDataUrl] = useState<string | null>(null);

  const { data: quiz, isLoading } = useQuery<QuizWithBg>({
    queryKey: ["quiz", quizId],
    queryFn: () => invoke<QuizWithBg>("get_quiz", { id: quizId }),
    enabled: !!quizId,
  });

  // Load cached background from disk as base64 data URL
  useEffect(() => {
    if (!quiz?.backgroundUrl) return;
    invoke<string>("get_background", { quizId: quiz.id })
      .then(setBgDataUrl)
      .catch(() => setBgDataUrl(null));
  }, [quiz?.backgroundUrl, quiz?.id]);

  // Play all supported question types
  const playableQuestions = useMemo(
    () =>
      (quiz?.questions ?? []).filter((q) =>
        [
          "single_choice",
          "multiple_choice",
          "true_false",
          "text_input",
          "matching",
          "ordering",
          "fill_blank",
          "hotspot",
        ].includes(q.type),
      ),
    [quiz?.questions],
  );
  const playableQuiz = useMemo(
    () => (quiz ? { ...quiz, questions: playableQuestions } : null),
    [quiz, playableQuestions],
  );

  const engineRef = useRef<QuizEngine | null>(null);
  const [state, setState] = useState<
    "idle" | "playing" | "feedback" | "finished"
  >("idle");
  const [selectedSingle, setSelectedSingle] = useState<string | null>(null);
  const [selectedMulti, setSelectedMulti] = useState<string[]>([]);
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

  function startTimer(limit: number) {
    timerRef.current = setInterval(() => {
      setElapsed((p) => {
        const next = p + 100;
        if (next >= limit) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          // fire timeout on next tick so state update completes first
          setTimeout(() => {
            const eng = engineRef.current;
            if (eng && eng.getState() === "question") {
              eng.timeout();
              setLastCorrect(false);
              setState("feedback");
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

  function initQuestionState(q: Question | undefined) {
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

  function startQuiz() {
    if (!playableQuiz) return;
    engineRef.current = new QuizEngine(playableQuiz);
    engineRef.current.start("Preview");
    setState("playing");
    setSelectedSingle(null);
    setSelectedMulti([]);
    setTextAnswer("");
    setElapsed(0);
    const firstQ = engineRef.current.getCurrentQuestion() ?? undefined;
    initQuestionState(firstQ);
    startTimer((firstQ?.timeLimit ?? 30) * 1000);
  }

  function recordResult() {
    const engine = engineRef.current;
    const answers = engine!.getAnswers();
    const last = answers[answers.length - 1];
    setLastCorrect(last?.isCorrect ?? false);
    setState("feedback");
  }

  // Single-tap submits immediately (no separate button) — ideal for panels
  function clickSingle(optionId: string) {
    const engine = engineRef.current;
    if (state !== "playing" || !engine) return;
    stopTimer();
    setSelectedSingle(optionId);
    engine.submitAnswer({ type: "single_choice", optionId });
    recordResult();
  }

  function clickTrueFalse(value: boolean) {
    const engine = engineRef.current;
    if (state !== "playing" || !engine) return;
    stopTimer();
    setSelectedSingle(value ? "true" : "false");
    engine.submitAnswer({ type: "true_false", value });
    recordResult();
  }

  function submitTextInput() {
    const engine = engineRef.current;
    if (state !== "playing" || !engine || !textAnswer.trim()) return;
    stopTimer();
    engine.submitAnswer({ type: "text_input", text: textAnswer.trim() });
    recordResult();
  }

  function submitMatching() {
    const engine = engineRef.current;
    if (state !== "playing" || !engine) return;
    const q = engine.getCurrentQuestion() as MatchingQuestion;
    const pairs = q.pairs.map((p) => ({
      leftId: p.id,
      rightId: matchingMap[p.id] ?? "",
    }));
    stopTimer();
    engine.submitAnswer({ type: "matching", pairs });
    recordResult();
  }

  function submitOrdering() {
    const engine = engineRef.current;
    if (state !== "playing" || !engine) return;
    stopTimer();
    engine.submitAnswer({ type: "ordering", order: orderingItems });
    recordResult();
  }

  function submitFillBlank() {
    const engine = engineRef.current;
    if (state !== "playing" || !engine) return;
    stopTimer();
    engine.submitAnswer({ type: "fill_blank", answers: fillBlankAnswers });
    recordResult();
  }

  function clickHotspot(x: number, y: number) {
    const engine = engineRef.current;
    if (state !== "playing" || !engine) return;
    stopTimer();
    setHotspotClick({ x, y });
    engine.submitAnswer({ type: "hotspot", x, y });
    recordResult();
  }

  function toggleMulti(id: string) {
    if (state !== "playing") return;
    setSelectedMulti((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );
  }

  function submitMulti() {
    const engine = engineRef.current;
    if (state !== "playing" || !engine || !selectedMulti.length) return;
    stopTimer();
    engine.submitAnswer({ type: "multiple_choice", optionIds: selectedMulti });
    recordResult();
  }

  function next() {
    if (!engineRef.current) return;
    engineRef.current.next();
    if (engineRef.current.getState() === "completed") {
      setState("finished");
    } else {
      setSelectedSingle(null);
      setSelectedMulti([]);
      setTextAnswer("");
      setElapsed(0);
      const nextQ = engineRef.current.getCurrentQuestion() ?? undefined;
      initQuestionState(nextQ);
      startTimer((nextQ?.timeLimit ?? 30) * 1000);
      setState("playing");
    }
  }

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: DEFAULT_GRADIENT }}
      >
        <Spinner size="lg" />
      </div>
    );
  }
  if (!quiz || !playableQuiz) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-white"
        style={{ background: DEFAULT_GRADIENT }}
      >
        <p>Квиз не найден.</p>
      </div>
    );
  }

  const engine = engineRef.current;
  const currentQuestion =
    state === "playing" || state === "feedback"
      ? engine?.getCurrentQuestion()
      : undefined;
  const questionIndex = engine ? engine.getCurrentQuestionIndex() : 0;
  const total = playableQuestions.length;
  const result = state === "finished" ? engine?.getResult() : null;
  const remainingLives =
    state === "playing" || state === "feedback"
      ? engine?.getRemainingLives()
      : undefined;
  const timeLimit = (currentQuestion?.timeLimit ?? 30) * 1000;
  const timeLeft = Math.max(0, timeLimit - elapsed);
  const timerPct = timeLeft / timeLimit;
  const progressPct = total > 0 ? (questionIndex / total) * 100 : 0;

  const bgImage = bgDataUrl
    ? {
        backgroundImage: `url(${bgDataUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {};
  const gradient = SUBJECT_GRADIENTS[quiz.subject ?? ""] ?? DEFAULT_GRADIENT;

  const glass: React.CSSProperties = {
    background: "rgba(0,0,0,0.50)",
    backdropFilter: "blur(22px)",
    WebkitBackdropFilter: "blur(22px)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "20px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
  };

  return (
    <div
      className="min-h-screen relative text-white overflow-hidden select-none"
      style={{ background: gradient, ...bgImage }}
    >
      {/* Overlay: lighter in playing so the art breathes; darker for idle/finished */}
      {bgDataUrl && (
        <div
          className="absolute inset-0"
          style={{
            background:
              state === "playing" || state === "feedback"
                ? "rgba(0,0,0,0.28)"
                : "rgba(0,0,0,0.55)",
            backdropFilter:
              state === "playing" || state === "feedback"
                ? "none"
                : "blur(3px)",
          }}
        />
      )}
      {/* Vignette only for idle/finished */}
      {(state === "idle" || state === "finished") && (
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.65) 100%)",
          }}
        />
      )}

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div
        className="relative z-10 flex flex-col"
        style={{ height: "100vh", overflow: "hidden" }}
      >
        {/* Top progress strip */}
        <div className="h-[6px] bg-black/30">
          <div
            style={{
              width: `${progressPct}%`,
              height: "100%",
              background: "linear-gradient(90deg, #818cf8, #c084fc)",
              transition: "width 0.6s ease-out",
              boxShadow: "0 0 12px rgba(192,132,252,0.7)",
            }}
          />
        </div>

        {/* ── IDLE ───────────────────────────────────────────────────────────── */}
        {state === "idle" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div
              style={{
                ...glass,
                maxWidth: 560,
                width: "100%",
                padding: "52px 48px",
              }}
            >
              <div
                style={{
                  fontSize: "clamp(3rem,8vw,6rem)",
                  marginBottom: "24px",
                }}
              >
                🎯
              </div>
              <h1
                style={{
                  fontSize: "clamp(1.6rem,4vw,3rem)",
                  fontWeight: 900,
                  lineHeight: 1.1,
                  marginBottom: 8,
                }}
              >
                {quiz.title}
              </h1>
              {quiz.subject && (
                <p
                  style={{
                    color: "#c084fc",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: "28px",
                  }}
                >
                  {quiz.subject}
                  {quiz.gradeLevel ? ` · ${quiz.gradeLevel} класс` : ""}
                </p>
              )}
              <p
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "clamp(1rem,2vw,1.4rem)",
                  marginBottom: "40px",
                }}
              >
                {total} {pluralQ(total)}
              </p>
              <button
                data-demo="start-quiz"
                onClick={startQuiz}
                style={{
                  background: "linear-gradient(135deg,#7c3aed 0%,#6366f1 100%)",
                  boxShadow: "0 8px 32px rgba(124,58,237,0.55)",
                  border: "none",
                  borderRadius: "16px",
                  padding: "clamp(14px,2vh,22px) clamp(36px,6vw,72px)",
                  fontSize: "clamp(1rem,2vw,1.5rem)",
                  fontWeight: 800,
                  color: "#fff",
                  cursor: "pointer",
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    "scale(1)";
                }}
              >
                ▶ Начать
              </button>
            </div>
          </div>
        )}

        {/* ── PLAYING / FEEDBACK ─────────────────────────────────────────────── */}
        {(state === "playing" || state === "feedback") &&
          currentQuestion &&
          (() => {
            const isFeedback = state === "feedback";

            // Collect options for single/multi
            const q = currentQuestion as
              | SingleChoiceQuestion
              | MultipleChoiceQuestion;
            const opts =
              "options" in currentQuestion
                ? ((currentQuestion as SingleChoiceQuestion).options ?? [])
                : [];
            const correctSingleId =
              "correctOptionId" in currentQuestion
                ? (currentQuestion as SingleChoiceQuestion).correctOptionId
                : null;
            const correctMultiIds =
              "correctOptionIds" in currentQuestion
                ? (currentQuestion as MultipleChoiceQuestion).correctOptionIds
                : [];
            const correctBool =
              "correctAnswer" in currentQuestion
                ? (currentQuestion as { correctAnswer: boolean }).correctAnswer
                : null;

            const timerColor =
              timerPct > 0.4
                ? "#a78bfa"
                : timerPct > 0.2
                  ? "#fbbf24"
                  : "#f87171";
            const timerGlow =
              timerPct > 0.4
                ? "rgba(167,139,250,0.8)"
                : timerPct > 0.2
                  ? "rgba(251,191,36,0.8)"
                  : "rgba(248,113,113,0.8)";

            return (
              <>
                {/* ── TOP ZONE: арт + вопрос ─────────────────────────────── */}
                <div
                  style={{
                    height: "42vh",
                    minHeight: 130,
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    padding: "14px 24px 22px",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 18,
                      color: "rgba(255,255,255,0.7)",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textShadow: "0 1px 8px rgba(0,0,0,0.9)",
                      textTransform: "uppercase",
                    }}
                  >
                    Вопрос {questionIndex + 1} / {total}
                    {remainingLives !== undefined && (
                      <span
                        style={{
                          marginLeft: 10,
                          color:
                            remainingLives <= 1
                              ? "#f87171"
                              : remainingLives <= 2
                                ? "#fbbf24"
                                : "#fb7185",
                          fontSize: "0.85rem",
                        }}
                      >
                        {"❤️".repeat(remainingLives)}
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 18,
                      color: timerColor,
                      fontSize: "clamp(1.1rem,2.2vw,1.5rem)",
                      fontWeight: 900,
                      fontFamily: "'JetBrains Mono', monospace",
                      textShadow: `0 0 16px ${timerGlow}, 0 0 4px ${timerGlow}`,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {Math.ceil(timeLeft / 1000)}
                  </span>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "clamp(1.5rem,3.2vw,2.6rem)",
                      fontWeight: 900,
                      lineHeight: 1.2,
                      textShadow:
                        "0 2px 28px rgba(0,0,0,1), 0 1px 6px rgba(0,0,0,0.95)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {currentQuestion.text}
                  </p>
                </div>

                {/* ── TIMER HORIZON ─────────────────────────────────────── */}
                <div
                  style={{
                    height: 4,
                    background: "rgba(255,255,255,0.06)",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${timerPct * 100}%`,
                      background: timerColor,
                      boxShadow: `0 0 12px ${timerGlow}`,
                      transition: "width 0.1s linear, background 0.5s",
                    }}
                  />
                </div>

                {/* ── TILES ZONE ────────────────────────────────────────── */}
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    background: "#0d0d12",
                    display: "flex",
                    flexDirection: "column",
                    padding: "10px 12px",
                    gap: 8,
                  }}
                >
                  {/* ── single_choice tiles ── */}
                  {currentQuestion.type === "single_choice" && (
                    <div
                      style={{
                        flex: 1,
                        minHeight: 0,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gridTemplateRows: `repeat(${Math.ceil(opts.length / 2)}, 1fr)`,
                        gap: 8,
                      }}
                    >
                      {opts.map((opt, i) => {
                        const tc = TILE_COLORS[i % TILE_COLORS.length]!;
                        const isChosen = selectedSingle === opt.id;
                        const isCorrect =
                          isFeedback && opt.id === correctSingleId;
                        const isWrong = isFeedback && isChosen && !isCorrect;
                        const dimmed = isFeedback && !isCorrect && !isChosen;
                        return (
                          <button
                            key={opt.id}
                            data-demo-opt={i}
                            disabled={isFeedback}
                            onClick={() => clickSingle(opt.id)}
                            style={{
                              background: isCorrect
                                ? "linear-gradient(145deg,#16a34a,#22c55e)"
                                : isWrong
                                  ? "linear-gradient(145deg,#7f1d1d,#991b1b)"
                                  : tc.bg,
                              opacity: dimmed ? 0.4 : 1,
                              boxShadow: isCorrect
                                ? "0 0 40px rgba(34,197,94,0.7), 0 8px 24px rgba(0,0,0,0.5)"
                                : isChosen && !isFeedback
                                  ? `0 0 32px ${tc.glow}, 0 8px 24px rgba(0,0,0,0.5)`
                                  : "0 4px 16px rgba(0,0,0,0.45)",
                              transform: isCorrect ? "scale(1.03)" : "scale(1)",
                              transition: "all 0.2s ease",
                              border: isCorrect
                                ? "2.5px solid rgba(134,239,172,0.8)"
                                : isWrong
                                  ? "2.5px solid rgba(248,113,113,0.7)"
                                  : "2.5px solid transparent",
                              borderRadius: "16px",
                              display: "flex",
                              alignItems: "center",
                              gap: "clamp(10px,1.5vw,20px)",
                              padding: "0 clamp(14px,2vw,28px)",
                              cursor: isFeedback ? "default" : "pointer",
                            }}
                          >
                            <span
                              style={{
                                width: "clamp(36px,5vw,58px)",
                                height: "clamp(36px,5vw,58px)",
                                borderRadius: "12px",
                                background: "rgba(0,0,0,0.35)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "clamp(1rem,1.8vw,1.5rem)",
                                fontWeight: 900,
                                flexShrink: 0,
                                border: "2px solid rgba(255,255,255,0.2)",
                              }}
                            >
                              {isCorrect ? "✓" : isWrong ? "✗" : LETTERS[i]}
                            </span>
                            <span
                              style={{
                                fontSize: "clamp(0.95rem,2vw,1.6rem)",
                                fontWeight: 700,
                                lineHeight: 1.2,
                                textAlign: "left",
                                flex: 1,
                              }}
                            >
                              {opt.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* ── multiple_choice tiles ── */}
                  {currentQuestion.type === "multiple_choice" && (
                    <>
                      <div
                        style={{
                          flex: 1,
                          minHeight: 0,
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gridTemplateRows: `repeat(${Math.ceil((q as MultipleChoiceQuestion).options.length / 2)}, 1fr)`,
                          gap: 8,
                        }}
                      >
                        {(q as MultipleChoiceQuestion).options.map((opt, i) => {
                          const tc = TILE_COLORS[i % TILE_COLORS.length]!;
                          const isChosen = selectedMulti.includes(opt.id);
                          const isCorrect =
                            isFeedback && correctMultiIds.includes(opt.id);
                          const isWrong = isFeedback && isChosen && !isCorrect;
                          const dimmed = isFeedback && !isCorrect && !isChosen;
                          return (
                            <button
                              key={opt.id}
                              disabled={isFeedback}
                              onClick={() => toggleMulti(opt.id)}
                              style={{
                                background: isCorrect
                                  ? "linear-gradient(145deg,#16a34a,#22c55e)"
                                  : isWrong
                                    ? "linear-gradient(145deg,#7f1d1d,#991b1b)"
                                    : tc.bg,
                                opacity: dimmed ? 0.4 : 1,
                                boxShadow: isCorrect
                                  ? "0 0 40px rgba(34,197,94,0.7), 0 8px 24px rgba(0,0,0,0.5)"
                                  : isChosen
                                    ? `0 0 32px ${tc.glow}, 0 8px 24px rgba(0,0,0,0.5)`
                                    : "0 4px 16px rgba(0,0,0,0.45)",
                                transform:
                                  isCorrect || (isChosen && !isFeedback)
                                    ? "scale(1.02)"
                                    : "scale(1)",
                                transition: "all 0.2s ease",
                                border: isCorrect
                                  ? "2.5px solid rgba(134,239,172,0.8)"
                                  : isChosen && !isFeedback
                                    ? "2.5px solid rgba(255,255,255,0.5)"
                                    : "2.5px solid transparent",
                                borderRadius: 16,
                                display: "flex",
                                alignItems: "center",
                                gap: "clamp(8px,1.2vw,16px)",
                                padding: "0 clamp(10px,1.5vw,20px)",
                                cursor: isFeedback ? "default" : "pointer",
                              }}
                            >
                              <span
                                style={{
                                  width: "clamp(26px,3vw,40px)",
                                  height: "clamp(26px,3vw,40px)",
                                  borderRadius: 9,
                                  background: "rgba(0,0,0,0.3)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "clamp(0.75rem,1.2vw,1rem)",
                                  fontWeight: 900,
                                  flexShrink: 0,
                                  border: "1.5px solid rgba(255,255,255,0.15)",
                                }}
                              >
                                {isCorrect
                                  ? "✓"
                                  : isWrong
                                    ? "✗"
                                    : isChosen
                                      ? "☑"
                                      : LETTERS[i]}
                              </span>
                              <span
                                style={{
                                  fontSize: "clamp(0.9rem,1.7vw,1.35rem)",
                                  fontWeight: 700,
                                  lineHeight: 1.2,
                                  textAlign: "left",
                                  flex: 1,
                                }}
                              >
                                {opt.text}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {!isFeedback && (
                        <button
                          disabled={selectedMulti.length === 0}
                          onClick={submitMulti}
                          style={{
                            background:
                              selectedMulti.length > 0
                                ? "linear-gradient(135deg,#7c3aed,#6366f1)"
                                : "rgba(255,255,255,0.1)",
                            border: "none",
                            borderRadius: "14px",
                            padding: "clamp(12px,2vh,18px)",
                            fontSize: "clamp(0.9rem,1.8vw,1.3rem)",
                            fontWeight: 800,
                            color: "#fff",
                            cursor:
                              selectedMulti.length > 0
                                ? "pointer"
                                : "not-allowed",
                            opacity: selectedMulti.length > 0 ? 1 : 0.45,
                            transition: "all 0.2s",
                            boxShadow:
                              selectedMulti.length > 0
                                ? "0 6px 24px rgba(124,58,237,0.5)"
                                : "none",
                            flexShrink: 0,
                          }}
                        >
                          Подтвердить выбор ({selectedMulti.length})
                        </button>
                      )}
                    </>
                  )}

                  {/* ── true_false tiles ── */}
                  {currentQuestion.type === "true_false" && (
                    <div
                      style={{
                        flex: 1,
                        minHeight: 0,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                      }}
                    >
                      {([true, false] as const).map((val) => {
                        const key = val ? "true" : "false";
                        const isChosen = selectedSingle === key;
                        const isCorrect = isFeedback && val === correctBool;
                        const isWrong = isFeedback && isChosen && !isCorrect;
                        const dimmed = isFeedback && !isCorrect && !isChosen;
                        return (
                          <button
                            key={key}
                            data-demo-tf={key}
                            disabled={isFeedback}
                            onClick={() => clickTrueFalse(val)}
                            style={{
                              background: isCorrect
                                ? "linear-gradient(145deg,#16a34a,#22c55e)"
                                : isWrong
                                  ? "linear-gradient(145deg,#7f1d1d,#991b1b)"
                                  : val
                                    ? "linear-gradient(145deg,#166534,#16a34a)"
                                    : "linear-gradient(145deg,#7f1d1d,#dc2626)",
                              opacity: dimmed ? 0.4 : 1,
                              boxShadow: isCorrect
                                ? "0 0 40px rgba(34,197,94,0.7)"
                                : isChosen
                                  ? val
                                    ? "0 0 32px rgba(22,197,94,0.5)"
                                    : "0 0 32px rgba(220,38,38,0.5)"
                                  : "0 4px 20px rgba(0,0,0,0.5)",
                              transform: isCorrect ? "scale(1.03)" : "scale(1)",
                              transition: "all 0.2s ease",
                              border: isCorrect
                                ? "2.5px solid rgba(134,239,172,0.8)"
                                : "2.5px solid transparent",
                              borderRadius: "20px",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "10px",
                              cursor: isFeedback ? "default" : "pointer",
                            }}
                          >
                            <span style={{ fontSize: "clamp(2rem,6vw,5rem)" }}>
                              {isCorrect
                                ? "✅"
                                : isWrong
                                  ? "❌"
                                  : val
                                    ? "✅"
                                    : "❌"}
                            </span>
                            <span
                              style={{
                                fontSize: "clamp(1.1rem,2.5vw,2rem)",
                                fontWeight: 900,
                              }}
                            >
                              {val ? "Верно" : "Неверно"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* ── text_input ── */}
                  {currentQuestion.type === "text_input" &&
                    (() => {
                      const q = currentQuestion as TextInputQuestion;
                      const correctAnswers = q.correctAnswers ?? [];
                      const isAnswered = isFeedback;
                      return (
                        <div
                          style={{
                            flex: 1,
                            minHeight: 0,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            gap: 16,
                            padding: "20px 8px",
                          }}
                        >
                          <div
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              border: "2px solid rgba(255,255,255,0.12)",
                              borderRadius: 16,
                              padding: "20px 24px",
                            }}
                          >
                            <p
                              style={{
                                color: "rgba(255,255,255,0.5)",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                marginBottom: 12,
                              }}
                            >
                              Введите ответ
                            </p>
                            <input
                              type="text"
                              autoFocus
                              disabled={isAnswered}
                              value={textAnswer}
                              onChange={(e) => setTextAnswer(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") submitTextInput();
                              }}
                              placeholder="Ваш ответ…"
                              style={{
                                width: "100%",
                                background: "rgba(0,0,0,0.4)",
                                border: isAnswered
                                  ? lastCorrect
                                    ? "2px solid #22c55e"
                                    : "2px solid #ef4444"
                                  : "2px solid rgba(255,255,255,0.2)",
                                borderRadius: 12,
                                padding: "14px 18px",
                                fontSize: "clamp(1rem,2vw,1.4rem)",
                                fontWeight: 700,
                                color: "#fff",
                                outline: "none",
                                transition: "border-color 0.2s",
                              }}
                            />
                            {isAnswered && (
                              <p
                                style={{
                                  marginTop: 10,
                                  fontSize: "0.8rem",
                                  color: "rgba(255,255,255,0.5)",
                                }}
                              >
                                Правильный ответ:{" "}
                                <strong style={{ color: "#86efac" }}>
                                  {correctAnswers[0]}
                                </strong>
                              </p>
                            )}
                          </div>
                          {!isAnswered && (
                            <button
                              disabled={!textAnswer.trim()}
                              onClick={submitTextInput}
                              style={{
                                background: textAnswer.trim()
                                  ? "linear-gradient(135deg,#7c3aed,#6366f1)"
                                  : "rgba(255,255,255,0.1)",
                                border: "none",
                                borderRadius: 14,
                                padding: "clamp(12px,2vh,18px)",
                                fontSize: "clamp(0.9rem,1.8vw,1.3rem)",
                                fontWeight: 800,
                                color: "#fff",
                                cursor: textAnswer.trim()
                                  ? "pointer"
                                  : "not-allowed",
                                opacity: textAnswer.trim() ? 1 : 0.45,
                                transition: "all 0.2s",
                                boxShadow: textAnswer.trim()
                                  ? "0 6px 24px rgba(124,58,237,0.5)"
                                  : "none",
                              }}
                            >
                              Подтвердить ответ
                            </button>
                          )}
                        </div>
                      );
                    })()}

                  {/* ── matching ── */}
                  {currentQuestion.type === "matching" &&
                    (() => {
                      const mq = currentQuestion as MatchingQuestion;
                      const allMapped = mq.pairs.every(
                        (p) => matchingMap[p.id],
                      );
                      return (
                        <div
                          style={{
                            flex: 1,
                            minHeight: 0,
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              minHeight: 0,
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 8,
                              overflow: "auto",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                              }}
                            >
                              <p
                                style={{
                                  color: "rgba(255,255,255,0.4)",
                                  fontSize: "0.65rem",
                                  fontWeight: 700,
                                  letterSpacing: "0.12em",
                                  textTransform: "uppercase",
                                  margin: 0,
                                }}
                              >
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
                                      setMatchingActive(
                                        isActive ? null : pair.id,
                                      )
                                    }
                                    style={{
                                      background: isActive
                                        ? "rgba(124,58,237,0.4)"
                                        : hasMatch
                                          ? "rgba(34,197,94,0.15)"
                                          : "rgba(255,255,255,0.07)",
                                      border: isActive
                                        ? "2px solid #a78bfa"
                                        : hasMatch
                                          ? "2px solid rgba(134,239,172,0.4)"
                                          : "2px solid rgba(255,255,255,0.1)",
                                      borderRadius: 10,
                                      padding: "8px 12px",
                                      color: "#fff",
                                      textAlign: "left",
                                      fontSize: "clamp(0.78rem,1.3vw,0.95rem)",
                                      fontWeight: 600,
                                      cursor: isFeedback
                                        ? "default"
                                        : "pointer",
                                      transition: "all 0.15s",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    <span>{pair.left}</span>
                                    {matchingMap[pair.id] && (
                                      <span
                                        style={{
                                          color: "#86efac",
                                          fontSize: "0.7rem",
                                          fontWeight: 700,
                                          flexShrink: 0,
                                        }}
                                      >
                                        → {matchingMap[pair.id]}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                              }}
                            >
                              <p
                                style={{
                                  color: "rgba(255,255,255,0.4)",
                                  fontSize: "0.65rem",
                                  fontWeight: 700,
                                  letterSpacing: "0.12em",
                                  textTransform: "uppercase",
                                  margin: 0,
                                }}
                              >
                                Правая часть
                              </p>
                              {matchingShuffledRights.map((rightText) => {
                                const isUsed =
                                  Object.values(matchingMap).includes(
                                    rightText,
                                  );
                                const isMappedToActive = matchingActive
                                  ? matchingMap[matchingActive] === rightText
                                  : false;
                                return (
                                  <button
                                    key={rightText}
                                    disabled={
                                      isFeedback ||
                                      (!matchingActive &&
                                        isUsed &&
                                        !isMappedToActive)
                                    }
                                    onClick={() => {
                                      if (!matchingActive) return;
                                      setMatchingMap((prev) => ({
                                        ...prev,
                                        [matchingActive]: rightText,
                                      }));
                                      setMatchingActive(null);
                                    }}
                                    style={{
                                      background: isMappedToActive
                                        ? "rgba(34,197,94,0.25)"
                                        : isUsed
                                          ? "rgba(255,255,255,0.03)"
                                          : matchingActive
                                            ? "rgba(124,58,237,0.15)"
                                            : "rgba(255,255,255,0.07)",
                                      border: isMappedToActive
                                        ? "2px solid rgba(134,239,172,0.5)"
                                        : isUsed
                                          ? "2px solid rgba(255,255,255,0.05)"
                                          : "2px solid rgba(255,255,255,0.1)",
                                      opacity:
                                        isUsed && !isMappedToActive ? 0.4 : 1,
                                      borderRadius: 10,
                                      padding: "8px 12px",
                                      color: "#fff",
                                      textAlign: "left",
                                      fontSize: "clamp(0.78rem,1.3vw,0.95rem)",
                                      fontWeight: 600,
                                      cursor:
                                        isFeedback ||
                                        (!matchingActive && isUsed)
                                          ? "default"
                                          : "pointer",
                                      transition: "all 0.15s",
                                    }}
                                  >
                                    {rightText}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          {!isFeedback && (
                            <button
                              disabled={!allMapped}
                              onClick={submitMatching}
                              style={{
                                background: allMapped
                                  ? "linear-gradient(135deg,#7c3aed,#6366f1)"
                                  : "rgba(255,255,255,0.1)",
                                border: "none",
                                borderRadius: 14,
                                padding: "clamp(10px,1.8vh,16px)",
                                fontSize: "clamp(0.88rem,1.6vw,1.2rem)",
                                fontWeight: 800,
                                color: "#fff",
                                cursor: allMapped ? "pointer" : "not-allowed",
                                opacity: allMapped ? 1 : 0.45,
                                transition: "all 0.2s",
                                flexShrink: 0,
                                boxShadow: allMapped
                                  ? "0 6px 24px rgba(124,58,237,0.5)"
                                  : "none",
                              }}
                            >
                              Подтвердить соответствие
                            </button>
                          )}
                        </div>
                      );
                    })()}

                  {/* ── ordering ── */}
                  {currentQuestion.type === "ordering" &&
                    (() => {
                      const oq = currentQuestion as OrderingQuestion;
                      const itemMap = new Map(oq.items.map((i) => [i.id, i]));
                      return (
                        <div
                          style={{
                            flex: 1,
                            minHeight: 0,
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              minHeight: 0,
                              display: "flex",
                              flexDirection: "column",
                              gap: 5,
                              overflowY: "auto",
                            }}
                          >
                            {orderingItems.map((itemId, idx) => {
                              const item = itemMap.get(itemId);
                              if (!item) return null;
                              const isCorrect =
                                isFeedback && oq.correctOrder[idx] === itemId;
                              const isWrong =
                                isFeedback && oq.correctOrder[idx] !== itemId;
                              return (
                                <div
                                  key={itemId}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    background: isCorrect
                                      ? "rgba(34,197,94,0.15)"
                                      : isWrong
                                        ? "rgba(239,68,68,0.1)"
                                        : "rgba(255,255,255,0.07)",
                                    border: isCorrect
                                      ? "2px solid rgba(134,239,172,0.4)"
                                      : isWrong
                                        ? "2px solid rgba(252,165,165,0.3)"
                                        : "2px solid rgba(255,255,255,0.1)",
                                    borderRadius: 10,
                                    padding: "8px 12px",
                                    transition: "background 0.2s",
                                  }}
                                >
                                  <span
                                    style={{
                                      color: "rgba(255,255,255,0.35)",
                                      fontSize: "0.8rem",
                                      fontWeight: 700,
                                      width: 22,
                                      textAlign: "center",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {idx + 1}
                                  </span>
                                  <span
                                    style={{
                                      flex: 1,
                                      fontSize: "clamp(0.82rem,1.5vw,1.05rem)",
                                      fontWeight: 600,
                                      color: "#fff",
                                    }}
                                  >
                                    {item.text}
                                  </span>
                                  {!isFeedback && (
                                    <div
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 2,
                                        flexShrink: 0,
                                      }}
                                    >
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
                                        style={{
                                          background: "rgba(255,255,255,0.1)",
                                          border: "none",
                                          borderRadius: 5,
                                          width: 26,
                                          height: 20,
                                          cursor:
                                            idx === 0
                                              ? "not-allowed"
                                              : "pointer",
                                          color: "#fff",
                                          opacity: idx === 0 ? 0.2 : 1,
                                          fontSize: "0.75rem",
                                        }}
                                      >
                                        ↑
                                      </button>
                                      <button
                                        disabled={
                                          idx === orderingItems.length - 1
                                        }
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
                                        style={{
                                          background: "rgba(255,255,255,0.1)",
                                          border: "none",
                                          borderRadius: 5,
                                          width: 26,
                                          height: 20,
                                          cursor:
                                            idx === orderingItems.length - 1
                                              ? "not-allowed"
                                              : "pointer",
                                          color: "#fff",
                                          opacity:
                                            idx === orderingItems.length - 1
                                              ? 0.2
                                              : 1,
                                          fontSize: "0.75rem",
                                        }}
                                      >
                                        ↓
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {!isFeedback && (
                            <button
                              onClick={submitOrdering}
                              style={{
                                background:
                                  "linear-gradient(135deg,#7c3aed,#6366f1)",
                                border: "none",
                                borderRadius: 14,
                                padding: "clamp(10px,1.8vh,16px)",
                                fontSize: "clamp(0.88rem,1.6vw,1.2rem)",
                                fontWeight: 800,
                                color: "#fff",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                flexShrink: 0,
                                boxShadow: "0 6px 24px rgba(124,58,237,0.5)",
                              }}
                            >
                              Подтвердить порядок
                            </button>
                          )}
                        </div>
                      );
                    })()}

                  {/* ── fill_blank ── */}
                  {currentQuestion.type === "fill_blank" &&
                    (() => {
                      const fq = currentQuestion as FillBlankQuestion;
                      const blankMap = new Map(fq.blanks.map((b) => [b.id, b]));
                      // parse textWithBlanks into segments
                      const segments: Array<
                        | { type: "text"; text: string }
                        | { type: "blank"; id: string }
                      > = [];
                      const pat = /\{\{([^}]+)\}\}/g;
                      let m: RegExpExecArray | null;
                      let lastIdx = 0;
                      while ((m = pat.exec(fq.textWithBlanks)) !== null) {
                        if (m.index > lastIdx)
                          segments.push({
                            type: "text",
                            text: fq.textWithBlanks.slice(lastIdx, m.index),
                          });
                        segments.push({ type: "blank", id: m[1]! });
                        lastIdx = m.index + m[0].length;
                      }
                      if (lastIdx < fq.textWithBlanks.length)
                        segments.push({
                          type: "text",
                          text: fq.textWithBlanks.slice(lastIdx),
                        });
                      const allFilled = fq.blanks.every((b) =>
                        (fillBlankAnswers[b.id] ?? "").trim(),
                      );
                      return (
                        <div
                          style={{
                            flex: 1,
                            minHeight: 0,
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                            padding: "4px 4px",
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              minHeight: 0,
                              display: "flex",
                              flexWrap: "wrap",
                              alignContent: "flex-start",
                              alignItems: "center",
                              gap: "4px 6px",
                              overflowY: "auto",
                            }}
                          >
                            {segments.map((seg, i) =>
                              seg.type === "text" ? (
                                <span
                                  key={i}
                                  style={{
                                    fontSize: "clamp(0.9rem,1.8vw,1.25rem)",
                                    fontWeight: 600,
                                    color: "#fff",
                                    lineHeight: 2,
                                  }}
                                >
                                  {seg.text}
                                </span>
                              ) : (
                                (() => {
                                  const blank = blankMap.get(seg.id);
                                  const val = fillBlankAnswers[seg.id] ?? "";
                                  const isCorrect =
                                    isFeedback &&
                                    (blank?.correctAnswers ?? []).some(
                                      (a) =>
                                        a.trim().toLowerCase() ===
                                        val.trim().toLowerCase(),
                                    );
                                  const isWrong = isFeedback && !isCorrect;
                                  return (
                                    <input
                                      key={i}
                                      type="text"
                                      disabled={isFeedback}
                                      value={val}
                                      onChange={(e) =>
                                        setFillBlankAnswers((p) => ({
                                          ...p,
                                          [seg.id]: e.target.value,
                                        }))
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && allFilled)
                                          submitFillBlank();
                                      }}
                                      style={{
                                        width: `${Math.max(80, (val.length || 5) * 13)}px`,
                                        background: isCorrect
                                          ? "rgba(34,197,94,0.2)"
                                          : isWrong
                                            ? "rgba(239,68,68,0.2)"
                                            : "rgba(255,255,255,0.1)",
                                        border: isCorrect
                                          ? "2px solid #22c55e"
                                          : isWrong
                                            ? "2px solid #ef4444"
                                            : "2px solid rgba(255,255,255,0.2)",
                                        borderRadius: 8,
                                        padding: "4px 10px",
                                        color: "#fff",
                                        fontSize: "clamp(0.9rem,1.8vw,1.25rem)",
                                        fontWeight: 700,
                                        outline: "none",
                                        textAlign: "center",
                                        transition: "border-color 0.2s",
                                      }}
                                    />
                                  );
                                })()
                              ),
                            )}
                          </div>
                          {!isFeedback && (
                            <button
                              disabled={!allFilled}
                              onClick={submitFillBlank}
                              style={{
                                background: allFilled
                                  ? "linear-gradient(135deg,#7c3aed,#6366f1)"
                                  : "rgba(255,255,255,0.1)",
                                border: "none",
                                borderRadius: 14,
                                padding: "clamp(10px,1.8vh,16px)",
                                fontSize: "clamp(0.88rem,1.6vw,1.2rem)",
                                fontWeight: 800,
                                color: "#fff",
                                cursor: allFilled ? "pointer" : "not-allowed",
                                opacity: allFilled ? 1 : 0.45,
                                transition: "all 0.2s",
                                flexShrink: 0,
                                boxShadow: allFilled
                                  ? "0 6px 24px rgba(124,58,237,0.5)"
                                  : "none",
                              }}
                            >
                              Подтвердить ответы
                            </button>
                          )}
                        </div>
                      );
                    })()}

                  {/* ── hotspot ── */}
                  {currentQuestion.type === "hotspot" &&
                    (() => {
                      const hq = currentQuestion as HotspotQuestion;
                      return (
                        <div
                          style={{
                            flex: 1,
                            minHeight: 0,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                          }}
                        >
                          {hq.imageUrl ? (
                            <>
                              <div
                                style={{
                                  position: "relative",
                                  cursor: isFeedback ? "default" : "crosshair",
                                  borderRadius: 12,
                                  overflow: "hidden",
                                  maxHeight: "90%",
                                  border: "2px solid rgba(255,255,255,0.1)",
                                  userSelect: "none",
                                }}
                                onClick={(e) => {
                                  if (isFeedback) return;
                                  const rect =
                                    e.currentTarget.getBoundingClientRect();
                                  const x =
                                    Math.round(
                                      ((e.clientX - rect.left) / rect.width) *
                                        1000,
                                    ) / 10;
                                  const y =
                                    Math.round(
                                      ((e.clientY - rect.top) / rect.height) *
                                        1000,
                                    ) / 10;
                                  clickHotspot(x, y);
                                }}
                              >
                                <img
                                  src={hq.imageUrl}
                                  alt=""
                                  style={{
                                    display: "block",
                                    maxWidth: "100%",
                                    pointerEvents: "none",
                                  }}
                                  draggable={false}
                                />
                                {hotspotClick && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      left: `${hotspotClick.x}%`,
                                      top: `${hotspotClick.y}%`,
                                      transform: "translate(-50%,-50%)",
                                      width: 28,
                                      height: 28,
                                      borderRadius: "50%",
                                      border: `3px solid ${isFeedback ? (lastCorrect ? "#22c55e" : "#ef4444") : "#a78bfa"}`,
                                      background: isFeedback
                                        ? lastCorrect
                                          ? "rgba(34,197,94,0.3)"
                                          : "rgba(239,68,68,0.3)"
                                        : "rgba(167,139,250,0.3)",
                                      pointerEvents: "none",
                                    }}
                                  />
                                )}
                                {isFeedback &&
                                  hq.hotspots
                                    .filter((h) => h.isCorrect)
                                    .map((h) => (
                                      <div
                                        key={h.id}
                                        style={{
                                          position: "absolute",
                                          left: `${h.x}%`,
                                          top: `${h.y}%`,
                                          transform: "translate(-50%,-50%)",
                                          width: `${h.radius * 2}%`,
                                          aspectRatio: "1",
                                          borderRadius: "50%",
                                          border:
                                            "3px solid rgba(134,239,172,0.7)",
                                          background: "rgba(34,197,94,0.2)",
                                          pointerEvents: "none",
                                        }}
                                      />
                                    ))}
                              </div>
                              {!isFeedback && !hotspotClick && (
                                <p
                                  style={{
                                    color: "rgba(255,255,255,0.4)",
                                    fontSize: "0.85rem",
                                    fontWeight: 600,
                                    margin: 0,
                                  }}
                                >
                                  Нажмите на правильную точку
                                </p>
                              )}
                            </>
                          ) : (
                            <p
                              style={{
                                color: "rgba(255,255,255,0.4)",
                                fontSize: "0.9rem",
                              }}
                            >
                              Изображение не задано
                            </p>
                          )}
                        </div>
                      );
                    })()}

                  {/* Feedback banner + Next */}
                  {isFeedback && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          background: lastCorrect
                            ? "rgba(34,197,94,0.15)"
                            : "rgba(239,68,68,0.15)",
                          border: `1px solid ${lastCorrect ? "rgba(134,239,172,0.4)" : "rgba(252,165,165,0.4)"}`,
                          borderRadius: 10,
                          padding: "9px 14px",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span style={{ fontSize: "1.2rem" }}>
                          {lastCorrect ? "🎉" : "😔"}
                        </span>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "clamp(0.82rem,1.5vw,1rem)",
                            color: lastCorrect ? "#86efac" : "#fca5a5",
                          }}
                        >
                          {lastCorrect ? "Правильно!" : "Неверно"}
                        </span>
                        {currentQuestion.explanation && (
                          <span
                            style={{
                              fontSize: "clamp(0.68rem,1.1vw,0.85rem)",
                              opacity: 0.6,
                              marginLeft: 2,
                            }}
                          >
                            — {currentQuestion.explanation}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={next}
                        data-demo="next-btn"
                        style={{
                          background: "linear-gradient(135deg,#059669,#10b981)",
                          boxShadow: "0 4px 16px rgba(16,185,129,0.4)",
                          border: "none",
                          borderRadius: 10,
                          padding:
                            "clamp(9px,1.4vh,13px) clamp(16px,2.2vw,32px)",
                          fontSize: "clamp(0.82rem,1.5vw,1.05rem)",
                          fontWeight: 800,
                          color: "#fff",
                          cursor: "pointer",
                          transition: "transform 0.15s",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => {
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.transform = "scale(1.05)";
                        }}
                        onMouseLeave={(e) => {
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.transform = "scale(1)";
                        }}
                      >
                        Далее →
                      </button>
                    </div>
                  )}
                </div>
                {/* end tiles zone */}

                {/* ── FOOTER ──────────────────────────────────────────────── */}
                <div
                  style={{
                    height: 40,
                    background: "#090910",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 14px",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      color: "rgba(255,255,255,0.3)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {questionIndex + 1} / {total}
                    {remainingLives !== undefined && (
                      <span
                        style={{
                          color:
                            remainingLives <= 1
                              ? "#f87171"
                              : remainingLives <= 2
                                ? "#fbbf24"
                                : "#fb7185",
                          fontSize: "0.7rem",
                        }}
                      >
                        {"❤️".repeat(remainingLives)}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => navigate(-1)}
                    style={{
                      background: "none",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 7,
                      padding: "3px 10px",
                      color: "rgba(255,255,255,0.35)",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "rgba(255,255,255,0.7)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "rgba(255,255,255,0.35)";
                    }}
                  >
                    ← Выйти
                  </button>
                </div>
              </>
            );
          })()}

        {/* ── FINISHED ───────────────────────────────────────────────────── */}
        {state === "finished" && result && (
          <div
            data-demo="results-screen"
            style={{ flex: 1, display: "flex", flexDirection: "column" }}
          >
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div
                style={{
                  ...glass,
                  maxWidth: 480,
                  width: "100%",
                  padding: "52px 44px",
                }}
              >
                {(() => {
                  const pct = Math.round(
                    (result.earnedPoints / result.totalPoints) * 100,
                  );
                  const emoji =
                    pct >= 80
                      ? "🏆"
                      : pct >= 60
                        ? "🥈"
                        : pct >= 40
                          ? "🥉"
                          : "📚";
                  return (
                    <>
                      <div
                        style={{
                          fontSize: "clamp(4rem,8vw,7rem)",
                          marginBottom: "16px",
                        }}
                      >
                        {emoji}
                      </div>
                      <h2
                        style={{
                          fontSize: "clamp(1.4rem,3.5vw,2.5rem)",
                          fontWeight: 900,
                          marginBottom: "8px",
                        }}
                      >
                        Квиз завершён!
                      </h2>
                      <p
                        style={{
                          color: "rgba(255,255,255,0.5)",
                          marginBottom: "28px",
                          fontSize: "0.95rem",
                        }}
                      >
                        {quiz.title}
                      </p>
                      <div
                        style={{
                          background: "rgba(124,58,237,0.2)",
                          border: "1px solid rgba(167,139,250,0.35)",
                          borderRadius: "16px",
                          padding: "28px 24px",
                          marginBottom: "28px",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "clamp(2.5rem,6vw,4.5rem)",
                            fontWeight: 900,
                            fontFamily: "'JetBrains Mono', monospace",
                            lineHeight: 1,
                          }}
                        >
                          {result.earnedPoints}
                          <span
                            style={{
                              fontSize: "40%",
                              color: "rgba(255,255,255,0.45)",
                              marginLeft: 8,
                            }}
                          >
                            / {result.totalPoints}
                          </span>
                        </p>
                        <p
                          style={{
                            color: "#a78bfa",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            marginBottom: "10px",
                          }}
                        >
                          очков
                        </p>
                        <p
                          style={{
                            fontSize: "clamp(1.5rem,3.5vw,2.5rem)",
                            fontWeight: 900,
                            color: "#fbbf24",
                          }}
                        >
                          {pct}%
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 12 }}>
                        <button
                          onClick={startQuiz}
                          style={{
                            flex: 1,
                            background:
                              "linear-gradient(135deg,#7c3aed,#6366f1)",
                            boxShadow: "0 6px 24px rgba(124,58,237,0.5)",
                            border: "none",
                            borderRadius: "14px",
                            padding: "clamp(12px,2vh,18px)",
                            fontSize: "clamp(0.9rem,1.6vw,1.2rem)",
                            fontWeight: 800,
                            color: "#fff",
                            cursor: "pointer",
                          }}
                        >
                          🔄 Заново
                        </button>
                        <button
                          onClick={() => navigate(-1)}
                          style={{
                            flex: 1,
                            background: "rgba(255,255,255,0.1)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            borderRadius: "14px",
                            padding: "clamp(12px,2vh,18px)",
                            fontSize: "clamp(0.9rem,1.6vw,1.2rem)",
                            fontWeight: 700,
                            color: "#fff",
                            cursor: "pointer",
                          }}
                        >
                          ← Редактор
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
