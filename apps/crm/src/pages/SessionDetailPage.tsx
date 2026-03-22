import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router";
import { Skeleton } from "@konstruktor/ui";
import type { SubmittedAnswer } from "@konstruktor/shared";

type AnswerDetail = {
  questionId: string;
  questionText: string;
  questionType: string;
  submittedAnswer: SubmittedAnswer;
  correctAnswer: unknown;
  isCorrect: boolean;
  pointsEarned: number;
  responseTimeMs: number;
};

type SessionDetail = {
  id: string;
  playerName: string;
  quizTitle: string;
  score: number;
  totalPoints: number;
  earnedPoints: number;
  isPassed: boolean | null;
  startedAt: string;
  completedAt: string | null;
  answers: AnswerDetail[];
};

function formatMs(ms: number): string {
  return ms < 1000 ? `${ms}мс` : `${(ms / 1000).toFixed(1)}с`;
}

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery<SessionDetail>({
    queryKey: ["session-detail", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load session");
      return (await res.json()) as SessionDetail;
    },
    enabled: !!sessionId,
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
          {data ? `${data.playerName} — ${data.quizTitle}` : "Детали попытки"}
        </h1>
      </header>

      <main className="p-8 space-y-6">
        {isLoading && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 flex flex-wrap gap-8">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton variant="text" className="w-16" />
                </div>
              ))}
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton variant="text" count={4} />
            </div>
          </div>
        )}
        {isError && <p className="text-red-500">Ошибка загрузки</p>}

        {data && (
          <>
            {/* Summary card */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 flex flex-wrap gap-8">
              <div>
                <p className="text-3xl font-bold text-slate-800">
                  {data.score}%
                </p>
                <p className="text-sm text-slate-500">Балл</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-800">
                  {data.earnedPoints} / {data.totalPoints}
                </p>
                <p className="text-sm text-slate-500">Очков</p>
              </div>
              <div>
                {data.isPassed === null ? (
                  <p className="text-3xl font-bold text-slate-400">—</p>
                ) : data.isPassed ? (
                  <p className="text-3xl font-bold text-green-600">Сдал</p>
                ) : (
                  <p className="text-3xl font-bold text-red-500">Не сдал</p>
                )}
                <p className="text-sm text-slate-500">Результат</p>
              </div>
              <div>
                <p className="text-base font-semibold text-slate-700">
                  {new Date(data.startedAt).toLocaleString("ru-RU")}
                </p>
                <p className="text-sm text-slate-500">Дата</p>
              </div>
            </div>

            {/* Per-question breakdown */}
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-slate-700">
                Ответы по вопросам
              </h2>
              {data.answers.map((a, i) => (
                <div
                  key={a.questionId}
                  className={`rounded-xl bg-white p-5 shadow-sm ring-1 ${
                    a.isCorrect ? "ring-green-200" : "ring-red-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-slate-400 mb-1">
                        Вопрос {i + 1} · {a.questionType}
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {a.questionText}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`text-xl ${
                          a.isCorrect ? "text-green-500" : "text-red-400"
                        }`}
                      >
                        {a.isCorrect ? "✓" : "✗"}
                      </span>
                      <p className="text-xs text-slate-400">
                        {a.pointsEarned} очк.
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatMs(a.responseTimeMs)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
