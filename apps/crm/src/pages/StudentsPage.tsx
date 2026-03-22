import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@konstruktor/ui";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

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

type SessionRow = {
  id: string;
  playerName: string;
  score: number;
  isPassed: boolean | null;
  startedAt: string;
};

type QuizSessions = {
  quizTitle: string;
  sessions: SessionRow[];
};

type StudentAgg = {
  name: string;
  attempts: number;
  avgScore: number;
  passRate: number;
  lastActive: string;
  quizzes: number;
  scoreHistory: Array<{ date: string; score: number }>;
};

export function StudentsPage() {
  const [search, setSearch] = useState("");

  // Fetch all quizzes
  const { data: quizzes, isLoading: quizzesLoading } = useQuery<QuizSummary[]>({
    queryKey: ["quizzes"],
    queryFn: async () => {
      const res = await fetch("/api/quizzes", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()) as QuizSummary[];
    },
  });

  // Fetch sessions for every quiz that has sessions
  const quizIds = useMemo(
    () => (quizzes ?? []).filter((q) => q.totalSessions > 0).map((q) => q.id),
    [quizzes],
  );

  const { data: allSessions, isLoading: sessionsLoading } = useQuery<
    SessionRow[]
  >({
    queryKey: ["all-sessions", quizIds],
    queryFn: async () => {
      const results: SessionRow[] = [];
      for (const id of quizIds) {
        const res = await fetch(`/api/quizzes/${id}/sessions`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = (await res.json()) as QuizSessions;
          results.push(...data.sessions);
        }
      }
      return results;
    },
    enabled: quizIds.length > 0,
  });

  // Aggregate by playerName
  const students = useMemo(() => {
    if (!allSessions?.length) return [];
    const map = new Map<
      string,
      {
        attempts: number;
        totalScore: number;
        passed: number;
        lastActive: string;
        quizIds: Set<string>;
        scores: Array<{ date: string; score: number }>;
      }
    >();
    for (const s of allSessions) {
      const key = s.playerName.trim();
      if (!key) continue;
      const existing = map.get(key);
      const dateStr = new Date(s.startedAt).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
      });
      if (existing) {
        existing.attempts++;
        existing.totalScore += s.score;
        if (s.isPassed) existing.passed++;
        if (s.startedAt > existing.lastActive)
          existing.lastActive = s.startedAt;
        existing.quizIds.add(s.id);
        existing.scores.push({ date: dateStr, score: s.score });
      } else {
        map.set(key, {
          attempts: 1,
          totalScore: s.score,
          passed: s.isPassed ? 1 : 0,
          lastActive: s.startedAt,
          quizIds: new Set([s.id]),
          scores: [{ date: dateStr, score: s.score }],
        });
      }
    }
    const result: StudentAgg[] = [];
    for (const [name, v] of map) {
      result.push({
        name,
        attempts: v.attempts,
        avgScore: Math.round(v.totalScore / v.attempts),
        passRate: Math.round((v.passed / v.attempts) * 100),
        lastActive: v.lastActive,
        quizzes: v.quizIds.size,
        scoreHistory: v.scores.slice(-10),
      });
    }
    return result.sort((a, b) => b.attempts - a.attempts);
  }, [allSessions]);

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter((s) => s.name.toLowerCase().includes(q));
  }, [students, search]);

  const isLoading = quizzesLoading || sessionsLoading;

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-800">Ученики</h1>
        <input
          type="text"
          placeholder="Поиск по имени…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 w-64"
        />
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
            >
              <Skeleton className="h-5 w-48" />
              <Skeleton variant="text" className="w-32 mt-2" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && students.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">👩‍🎓</div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">
            Пока нет учеников
          </h3>
          <p className="text-sm text-slate-400 max-w-sm">
            Когда ученики пройдут квизы, здесь появится агрегированная
            статистика по каждому.
          </p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Ученик
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Попыток
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Ср. балл
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  % сдачи
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Последняя активность
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Динамика
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.name} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {s.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.attempts}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-semibold ${s.avgScore >= 70 ? "text-emerald-600" : s.avgScore >= 50 ? "text-amber-500" : "text-red-500"}`}
                    >
                      {s.avgScore}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${s.passRate >= 70 ? "bg-emerald-500" : s.passRate >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                          style={{ width: `${s.passRate}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">
                        {s.passRate}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(s.lastActive).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="px-4 py-3">
                    {s.scoreHistory.length >= 2 ? (
                      <div className="w-24 h-8">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={s.scoreHistory}>
                            <Tooltip
                              formatter={(v) => [`${v}%`, "Балл"]}
                              contentStyle={{
                                fontSize: 11,
                                borderRadius: 8,
                                border: "1px solid #e2e8f0",
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="score"
                              stroke={
                                s.avgScore >= 70
                                  ? "#10b981"
                                  : s.avgScore >= 50
                                    ? "#f59e0b"
                                    : "#ef4444"
                              }
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && students.length > 0 && filtered.length === 0 && (
        <p className="text-center text-slate-400 py-8">
          Ничего не найдено по запросу «{search}»
        </p>
      )}
    </main>
  );
}
