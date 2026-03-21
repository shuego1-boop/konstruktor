import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import type { Quiz, QuizSession } from "@konstruktor/shared";
import {
  ScoreDisplay,
  StreakBadge,
  Badge,
  Button,
  AnswerFeedback,
} from "@konstruktor/ui";
import { playFinishWin, playFinishLose } from "../services/sound.ts";
import { AVATARS } from "./SetupPage.tsx";
import {
  processAchievements,
  type Achievement,
} from "../services/achievements.ts";

type LocationState = {
  session: QuizSession;
  quiz: Quiz;
};

/** Draws a 1080×1080 share card and returns a Blob */
async function buildShareCard(opts: {
  quizTitle: string;
  playerName: string;
  avatarEmoji: string;
  score: number;
  earnedPoints: number;
  totalPoints: number;
  passed: boolean;
}): Promise<Blob> {
  const SIZE = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  bg.addColorStop(0, "#312e81");
  bg.addColorStop(1, "#4c1d95");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Subtle grid pattern
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x < SIZE; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, SIZE);
    ctx.stroke();
  }
  for (let y = 0; y < SIZE; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(SIZE, y);
    ctx.stroke();
  }

  // Top label
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "bold 32px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Konstruktor", 80, 90);

  // Avatar circle
  const cx = SIZE / 2;
  const AVATAR_Y = 220;
  const R = 90;
  const grad = ctx.createRadialGradient(cx, AVATAR_Y, 0, cx, AVATAR_Y, R);
  grad.addColorStop(0, "#818cf8");
  grad.addColorStop(1, "#6d28d9");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, AVATAR_Y, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "100px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(opts.avatarEmoji, cx, AVATAR_Y + 6);

  // Player name
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,0.70)";
  ctx.font = "bold 44px system-ui, sans-serif";
  ctx.fillText(opts.playerName, cx, AVATAR_Y + R + 64);

  // Quiz title
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "36px system-ui, sans-serif";
  // wrap long titles
  const words = opts.quizTitle.split(" ");
  let line = "";
  let ty = AVATAR_Y + R + 120;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > SIZE - 200 && line) {
      ctx.fillText(line, cx, ty);
      line = word;
      ty += 48;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, cx, ty);

  // Score circle
  const SCORE_Y = 660;
  const SCORE_R = 170;
  // ring bg
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(cx, SCORE_Y, SCORE_R, -Math.PI / 2, Math.PI * 2 * 1.5);
  ctx.stroke();
  // ring fill
  const scoreGrad = ctx.createLinearGradient(
    cx - SCORE_R,
    SCORE_Y,
    cx + SCORE_R,
    SCORE_Y,
  );
  scoreGrad.addColorStop(0, "#a5b4fc");
  scoreGrad.addColorStop(1, "#c4b5fd");
  ctx.strokeStyle = scoreGrad;
  ctx.lineWidth = 18;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(
    cx,
    SCORE_Y,
    SCORE_R,
    -Math.PI / 2,
    -Math.PI / 2 + Math.PI * 2 * (opts.score / 100),
  );
  ctx.stroke();
  // score text
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 110px 'JetBrains Mono', monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${opts.score}%`, cx, SCORE_Y);
  // points label
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "34px system-ui, sans-serif";
  ctx.fillText(
    `${opts.earnedPoints} / ${opts.totalPoints} баллов`,
    cx,
    SCORE_Y + 60,
  );

  // Pass/fail badge
  ctx.textBaseline = "alphabetic";
  const badgeColor = opts.passed ? "#10b981" : "#f43f5e";
  const badgeText = opts.passed ? "✓ СДАЛ" : "✗ НЕ СДАЛ";
  const badgeW = ctx.measureText(badgeText).width + 64;
  const BADGE_Y = 890;
  ctx.fillStyle = badgeColor + "30";
  ctx.strokeStyle = badgeColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(cx - badgeW / 2, BADGE_Y - 44, badgeW, 60, 30);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = badgeColor;
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(badgeText, cx, BADGE_Y);

  // Bottom watermark
  ctx.fillStyle = "rgba(255,255,255,0.20)";
  ctx.font = "28px system-ui, sans-serif";
  ctx.fillText("konstruktor.app", cx, SIZE - 50);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas toBlob failed"))),
      "image/png",
    );
  });
}

export function ResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | undefined;
  const session = state?.session;
  const quiz = state?.quiz;

  const [displayPct, setDisplayPct] = useState(0);
  const animRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [shownAchievements, setShownAchievements] = useState(false);

  useEffect(() => {
    if (!session) return;
    const target = session.score;
    const start = performance.now();
    const duration = 1200;
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayPct(Math.round(eased * target));
      if (progress < 1) animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [session]);

  useEffect(() => {
    if (!session) return;
    if (session.score >= 60) {
      playFinishWin();
      const fire = (opts: confetti.Options) =>
        confetti({ ...opts, disableForReducedMotion: true });
      fire({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      setTimeout(
        () =>
          fire({ particleCount: 60, spread: 80, origin: { x: 0.1, y: 0.6 } }),
        300,
      );
      setTimeout(
        () =>
          fire({ particleCount: 60, spread: 80, origin: { x: 0.9, y: 0.6 } }),
        500,
      );
    } else {
      playFinishLose();
    }
  }, [session]);

  // Process achievements after a short delay (let score animation play first)
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => {
      const raw = localStorage.getItem("konstruktor_achievements_count");
      const prevCount = raw ? Number(raw) : 0;
      const newCount = prevCount + 1;
      localStorage.setItem("konstruktor_achievements_count", String(newCount));
      const unlocked = processAchievements(session, newCount);
      if (unlocked.length > 0) {
        setNewAchievements(unlocked);
        setShownAchievements(true);
      }
    }, 1600);
    return () => clearTimeout(timer);
  }, [session]);

  if (!session || !quiz) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Сессия не найдена.</p>
          <Button onClick={() => navigate("/home")}>На главную</Button>
        </div>
      </div>
    );
  }

  const passed =
    session.isPassed ?? session.score >= (quiz.settings.passingScore ?? 0);

  const avatarIndex = Number(localStorage.getItem("player_avatar") ?? 0);
  const avatar = AVATARS[avatarIndex] ?? AVATARS[0];

  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    setSharing(true);
    try {
      const blob = await buildShareCard({
        quizTitle: quiz.title,
        playerName: session.playerName,
        avatarEmoji: avatar.emoji,
        score: session.score ?? 0,
        earnedPoints: session.earnedPoints,
        totalPoints: session.totalPoints,
        passed,
      });
      const file = new File([blob], "result.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Мой результат: ${quiz.title}`,
          text: `Я набрал ${session.score}% в квизе «${quiz.title}»!`,
        });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "result.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // User cancelled share or error — silent
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="px-6 py-4 border-b border-slate-700 text-center">
        <h1 className="text-lg font-semibold">{quiz.title}</h1>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${avatar.bg} text-lg shadow-sm`}
          >
            {avatar.emoji}
          </span>
          <p className="text-sm text-slate-400">{session.playerName}</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 py-8 max-w-lg mx-auto w-full">
        <div className="mb-6">
          <ScoreDisplay
            points={session.earnedPoints}
            maxPoints={session.totalPoints}
            percentage={displayPct}
            size="lg"
          />
        </div>

        <div className="flex items-center gap-3 mb-8">
          <Badge
            variant={passed ? "success" : "error"}
            className="text-sm px-4 py-1.5"
          >
            {passed ? "СДАЛ" : "НЕ СДАЛ"}
          </Badge>
          {session.streakData.maxStreak >= 2 && (
            <StreakBadge streak={session.streakData.maxStreak} />
          )}
        </div>

        {session.answers.length > 0 && (
          <div className="w-full mb-8">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">
              Ответы по вопросам
            </h2>
            <div className="flex flex-col gap-2">
              {session.answers.map((answer, i) => {
                const question = quiz.questions.find(
                  (q) => q.id === answer.questionId,
                );
                return (
                  <div
                    key={answer.questionId}
                    className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-slate-200 flex-1">
                        <span className="text-slate-500 mr-2">Q{i + 1}</span>
                        {question?.text ?? "Вопрос удалён"}
                      </p>
                      <span
                        className={`text-lg font-bold ${
                          answer.isCorrect ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {answer.isCorrect ? "\u2713" : "\u2717"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {answer.pointsEarned} балл ·{" "}
                      {Math.round(answer.responseTimeMs / 1000)}с
                    </p>
                    {!answer.isCorrect && question?.explanation && (
                      <AnswerFeedback
                        correct={false}
                        explanation={question.explanation}
                        className="mt-2 text-sm"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 w-full">
          {quiz.settings.allowRetry && (
            <Button
              className="w-full"
              onClick={() => navigate(`/quiz/${session.quizId}`)}
            >
              Попробовать ещё раз
            </Button>
          )}
          <Button
            variant="secondary"
            className="w-full"
            loading={sharing}
            onClick={() => void handleShare()}
          >
            📤 Поделиться результатом
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => navigate("/home")}
          >
            На главную
          </Button>
        </div>
      </main>

      {/* ── Achievement toasts ──────────────────────────────────────── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col-reverse gap-3 z-50 pointer-events-none w-full max-w-sm px-4">
        <AnimatePresence>
          {shownAchievements &&
            newAchievements.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 40, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                transition={{
                  delay: i * 0.25,
                  type: "spring",
                  stiffness: 300,
                  damping: 22,
                }}
                onAnimationComplete={() => {
                  if (i === newAchievements.length - 1) {
                    setTimeout(() => setShownAchievements(false), 4000);
                  }
                }}
                className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-yellow-400/30 bg-yellow-950/90 px-4 py-3 shadow-2xl backdrop-blur-sm"
              >
                <span className="text-3xl">{a.emoji}</span>
                <div>
                  <p className="text-yellow-300 font-bold text-sm">
                    Ачивка разблокирована!
                  </p>
                  <p className="text-white font-semibold text-base">
                    {a.title}
                  </p>
                  <p className="text-yellow-200/60 text-xs">{a.description}</p>
                </div>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
