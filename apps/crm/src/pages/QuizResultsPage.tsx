import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";

type SessionRow = {
  id: string;
  playerName: string;
  score: number;
  isPassed: boolean | null;
  earnedPoints: number;
  totalPoints: number;
  startedAt: string;
  completedAt: string | null;
};

type QuestionStat = {
  questionId: string;
  total: number;
  correct: number;
  avgTimeMs: number;
};

type QuizStats = {
  quizTitle: string;
  totalSessions: number;
  averageScore: number;
  passRate: number;
  sessions: SessionRow[];
  questionStats: QuestionStat[];
};

type Insight = {
  emoji: string;
  title: string;
  body: string;
  color: string;
};

function buildInsights(data: QuizStats): Insight[] {
  const insights: Insight[] = [];
  const { sessions, averageScore, passRate, totalSessions } = data;

  if (totalSessions === 0) return [];

  // 1. Overall performance narrative
  if (averageScore >= 80) {
    insights.push({
      emoji: "🏆",
      title: "Отличный результат класса",
      body: `Средний балл ${averageScore}% — класс отлично усвоил материал. Можно переходить к следующей теме.`,
      color: "emerald",
    });
  } else if (averageScore >= 60) {
    insights.push({
      emoji: "📈",
      title: "Хороший прогресс",
      body: `Средний балл ${averageScore}%. Большинство учеников справились, но стоит повторить ключевые темы для отстающих.`,
      color: "indigo",
    });
  } else {
    insights.push({
      emoji: "⚠️",
      title: "Тема требует повторения",
      body: `Средний балл ${averageScore}% — ниже 60%. Рекомендуется провести дополнительное занятие перед следующим квизом.`,
      color: "rose",
    });
  }

  // 2. Pass rate insight
  if (passRate < 50 && totalSessions >= 3) {
    insights.push({
      emoji: "📚",
      title: "Большинство не сдали",
      body: `Только ${passRate}% учеников преодолели порог. Рассмотрите снижение проходного балла или пересмотр сложности вопросов.`,
      color: "amber",
    });
  } else if (passRate === 100 && totalSessions >= 3) {
    insights.push({
      emoji: "🌟",
      title: "Все сдали!",
      body: "Идеальная проходимость. Возможно, стоит повысить сложность квиза для этой группы.",
      color: "emerald",
    });
  }

  // 3. Score spread
  const scores = sessions.map((s) => s.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const spread = maxScore - minScore;
  if (spread >= 50 && totalSessions >= 4) {
    const top = sessions.filter((s) => s.score >= 80).map((s) => s.playerName);
    const struggling = sessions
      .filter((s) => s.score < 50)
      .map((s) => s.playerName);
    insights.push({
      emoji: "↔️",
      title: "Большой разброс баллов",
      body: `Разрыв между лучшим (${maxScore}%) и худшим (${minScore}%) результатом — ${spread}%. ${top.length > 0 ? `Лидеры: ${top.slice(0, 3).join(", ")}.` : ""} ${struggling.length > 0 ? `Требуют внимания: ${struggling.slice(0, 3).join(", ")}.` : ""}`,
      color: "violet",
    });
  }

  // 4. Completion time (if available)
  const timed = sessions.filter((s) => s.completedAt && s.startedAt);
  if (timed.length >= 3) {
    const durations = timed.map(
      (s) =>
        (new Date(s.completedAt!).getTime() - new Date(s.startedAt).getTime()) /
        60000,
    );
    const avgMin = Math.round(
      durations.reduce((a, b) => a + b, 0) / durations.length,
    );
    insights.push({
      emoji: "⏱️",
      title: "Среднее время прохождения",
      body: `Ученики тратят в среднем ${avgMin} мин. ${avgMin > 15 ? "Квиз довольно длинный — рассмотрите сокращение или увеличение лимита времени." : "Оптимальная длина квиза."}`,
      color: "sky",
    });
  }

  // 5. Best student spotlight
  const best = sessions.reduce((a, b) => (a.score > b.score ? a : b));
  if (best.score >= 90) {
    insights.push({
      emoji: "⭐",
      title: "Лучший результат",
      body: `${best.playerName} набрал ${best.score}% — отличный результат, достойный похвалы перед классом.`,
      color: "amber",
    });
  }

  // 6. Hard questions from questionStats
  const qs = data.questionStats ?? [];
  if (qs.length > 0) {
    const hardOnes = qs
      .filter((q) => q.total > 0 && q.correct / q.total < 0.4)
      .sort((a, b) => a.correct / a.total - b.correct / b.total)
      .slice(0, 3);
    if (hardOnes.length > 0) {
      const pcts = hardOnes.map((q) => Math.round((q.correct / q.total) * 100));
      insights.push({
        emoji: "🧩",
        title: "Сложные вопросы",
        body: `${hardOnes.length} вопрос${hardOnes.length > 1 ? "а" : ""} вызвали наибольшие затруднения — правильных ответов: ${pcts.join("%, ")}%. Рекомендуется разобрать их на следующем уроке.`,
        color: "rose",
      });
    }
  }

  return insights;
}

const INSIGHT_COLORS: Record<string, string> = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-900",
  rose: "border-rose-200 bg-rose-50 text-rose-900",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  violet: "border-violet-200 bg-violet-50 text-violet-900",
  sky: "border-sky-200 bg-sky-50 text-sky-900",
};

const col = createColumnHelper<SessionRow>();

const columns = [
  col.accessor("playerName", { header: "Ученик" }),
  col.accessor("score", {
    header: "Балл",
    cell: (info) => `${info.getValue()}%`,
  }),
  col.accessor("isPassed", {
    header: "Статус",
    cell: (info) => {
      const v = info.getValue();
      if (v === null) return <span className="text-slate-400">—</span>;
      return v ? (
        <span className="text-green-600 font-medium">Сдал</span>
      ) : (
        <span className="text-red-500 font-medium">Не сдал</span>
      );
    },
  }),
  col.accessor("startedAt", {
    header: "Дата",
    cell: (info) => new Date(info.getValue()).toLocaleDateString("ru-RU"),
  }),
];

export function QuizResultsPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery<QuizStats>({
    queryKey: ["quiz-results", quizId],
    queryFn: async () => {
      const res = await fetch(`/api/quizzes/${quizId}/sessions`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load results");
      return (await res.json()) as QuizStats;
    },
    enabled: !!quizId,
  });

  const table = useReactTable({
    data: data?.sessions ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          ← Назад
        </button>
        <h1 className="text-xl font-semibold text-slate-800">
          {data?.quizTitle ?? "Результаты"}
        </h1>
      </header>

      <main className="p-8 space-y-8">
        {isLoading && <p className="text-slate-400">Загрузка…</p>}
        {isError && <p className="text-red-500">Ошибка загрузки данных</p>}

        {data && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-6">
              {[
                { label: "Попыток", value: data.totalSessions },
                { label: "Ср. балл", value: `${data.averageScore}%` },
                { label: "Сдало", value: `${data.passRate}%` },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
                >
                  <p className="text-3xl font-bold text-slate-800">
                    {stat.value}
                  </p>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* AI Insights */}
            {data.totalSessions > 0 &&
              (() => {
                const insights = buildInsights(data);
                return insights.length > 0 ? (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-lg">✨</span>
                      <h2 className="text-base font-semibold text-slate-700">
                        AI-анализ
                      </h2>
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        на основе {data.totalSessions} попыток
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {insights.map((ins, i) => (
                        <div
                          key={i}
                          className={`rounded-2xl border p-5 ${INSIGHT_COLORS[ins.color] ?? INSIGHT_COLORS["indigo"]}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{ins.emoji}</span>
                            <p className="font-semibold text-sm">{ins.title}</p>
                          </div>
                          <p className="text-sm leading-relaxed opacity-80">
                            {ins.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

            {/* Per-question accuracy bars */}
            {data.questionStats && data.questionStats.length > 0 && (
              <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
                <h2 className="text-sm font-semibold text-slate-700 mb-4">
                  📊 Точность по вопросам
                </h2>
                <div className="flex flex-col gap-3">
                  {data.questionStats
                    .slice()
                    .sort((a, b) => a.correct / a.total - b.correct / b.total)
                    .map((qs, i) => {
                      const pct =
                        qs.total > 0
                          ? Math.round((qs.correct / qs.total) * 100)
                          : 0;
                      const barColor =
                        pct >= 70
                          ? "bg-emerald-500"
                          : pct >= 40
                            ? "bg-amber-400"
                            : "bg-red-500";
                      return (
                        <div
                          key={qs.questionId}
                          className="flex items-center gap-3"
                        >
                          <span className="text-xs text-slate-400 w-6 text-right shrink-0">
                            Q{i + 1}
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs font-mono w-10 text-right shrink-0 ${pct >= 70 ? "text-emerald-600" : pct >= 40 ? "text-amber-500" : "text-red-500"}`}
                          >
                            {pct}%
                          </span>
                          <span className="text-xs text-slate-400 w-24 shrink-0">
                            {Math.round(qs.avgTimeMs / 1000)}с ср. время
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Sessions table */}
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      {hg.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => navigate(`/session/${row.original.id}`)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 text-slate-700">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.sessions.length === 0 && (
                <p className="p-8 text-center text-slate-400">
                  \u041d\u0435\u0442 \u0437\u0430\u043f\u0438\u0441\u0435\u0439
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
