import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";

type QuizSummary = {
  id: string;
  title: string;
  subject: string | null;
  status: string;
  totalSessions: number;
  averageScore: number;
  updatedAt: string;
  createdAt: string;
};

/** Simple inline SVG sparkline from an array of values (0–max) */
function Sparkline({
  values,
  width = 80,
  height = 28,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const step = width / (values.length - 1);
  const pts = values
    .map((v, i) => `${i * step},${height - (v / max) * (height - 4) - 2}`)
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Derive a plausible per-day sparkline (last 7 values) from a quiz list */
function buildWeeklySparkline(quizzes: QuizSummary[]): number[] {
  // Distribute sessions across 7 buckets relative to updatedAt recency
  const buckets = new Array<number>(7).fill(0);
  const now = Date.now();
  for (const q of quizzes) {
    const daysAgo = Math.floor(
      (now - new Date(q.updatedAt).getTime()) / 86_400_000,
    );
    const bucket = Math.min(Math.max(6 - daysAgo, 0), 6);
    buckets[bucket] = (buckets[bucket] ?? 0) + q.totalSessions;
  }
  return buckets;
}

export function DashboardPage() {
  const { data: quizzes, isLoading } = useQuery<QuizSummary[]>({
    queryKey: ["quizzes"],
    queryFn: async () => {
      const res = await fetch("/api/quizzes", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load quizzes");
      return (await res.json()) as QuizSummary[];
    },
  });

  // Derived metrics
  const avgScore =
    quizzes && quizzes.length > 0
      ? Math.round(
          quizzes.reduce((s, q) => s + q.averageScore, 0) / quizzes.length,
        )
      : 0;
  const bestQuiz = quizzes
    ?.filter((q) => q.totalSessions > 0)
    .sort((a, b) => b.averageScore - a.averageScore)[0];
  const sparkline = quizzes ? buildWeeklySparkline(quizzes) : [];
  const thisWeekSessions = sparkline.slice(-7).reduce((a, b) => a + b, 0);

  return (
    <main className="p-8 space-y-8">
      {isLoading && <p className="text-slate-400">Загрузка…</p>}

      {/* ── Summary metrics row ─────────────────────────────────────── */}
      {!isLoading && quizzes && quizzes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total sessions this week */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 flex items-center justify-between gap-4">
            <div>
              <p className="text-3xl font-bold text-slate-800">
                {thisWeekSessions}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">попыток за неделю</p>
            </div>
            <div className="text-indigo-400 shrink-0">
              <Sparkline values={sparkline} />
            </div>
          </div>

          {/* Average score */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-3xl font-bold text-slate-800">{avgScore}%</p>
            <p className="text-sm text-slate-500 mt-0.5">
              средний балл по всем квизам
            </p>
            <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${avgScore >= 70 ? "bg-emerald-500" : avgScore >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                style={{ width: `${avgScore}%` }}
              />
            </div>
          </div>

          {/* Best quiz */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-lg">🏆</span>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Лучший квиз
              </p>
            </div>
            {bestQuiz ? (
              <Link
                to={`/quiz/${bestQuiz.id}/results`}
                className="hover:text-indigo-600 transition-colors"
              >
                <p className="font-semibold text-slate-800 line-clamp-2 leading-snug">
                  {bestQuiz.title}
                </p>
                <p className="text-sm text-emerald-600 font-bold mt-1">
                  {bestQuiz.averageScore}% ср. балл
                </p>
              </Link>
            ) : (
              <p className="text-slate-400 text-sm">Нет данных</p>
            )}
          </div>
        </div>
      )}

      {!isLoading && quizzes?.length === 0 && (
        <p className="text-slate-400">Нет квизов</p>
      )}

      {/* ── Quiz grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {quizzes?.map((quiz) => {
          const passColor =
            quiz.averageScore >= 70
              ? "bg-emerald-500"
              : quiz.averageScore >= 50
                ? "bg-amber-400"
                : "bg-red-400";
          return (
            <Link
              key={quiz.id}
              to={`/quiz/${quiz.id}/results`}
              className="group rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-indigo-300 overflow-hidden flex flex-col"
            >
              {/* Mini colour strip based on score */}
              <div className={`h-1.5 w-full ${passColor}`} />

              <div className="p-5 flex flex-col flex-1">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h2 className="text-base font-semibold text-slate-800 group-hover:text-indigo-700 line-clamp-2 flex-1">
                    {quiz.title}
                  </h2>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      quiz.status === "published"
                        ? "bg-green-100 text-green-700"
                        : quiz.status === "draft"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {quiz.status === "published"
                      ? "опубликован"
                      : quiz.status === "draft"
                        ? "черновик"
                        : quiz.status}
                  </span>
                </div>

                {quiz.subject && (
                  <p className="mb-3 text-xs text-slate-500">{quiz.subject}</p>
                )}

                <div className="flex gap-4 text-sm mt-auto">
                  <div>
                    <p className="text-lg font-bold text-slate-800">
                      {quiz.totalSessions}
                    </p>
                    <p className="text-xs text-slate-400">попыток</p>
                  </div>
                  <div>
                    <p
                      className={`text-lg font-bold ${quiz.averageScore >= 70 ? "text-emerald-600" : quiz.averageScore >= 50 ? "text-amber-500" : "text-red-500"}`}
                    >
                      {quiz.averageScore}%
                    </p>
                    <p className="text-xs text-slate-400">ср. балл</p>
                  </div>
                </div>

                {/* Pass rate bar */}
                <div className="mt-3 h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${passColor}`}
                    style={{ width: `${quiz.averageScore}%` }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
