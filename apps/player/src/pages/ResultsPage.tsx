import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { Quiz, QuizSession } from '@konstruktor/shared'
import { ScoreDisplay, StreakBadge, Badge, Button, AnswerFeedback } from '@konstruktor/ui'

type LocationState = {
  session: QuizSession
  quiz: Quiz
}

export function ResultsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | undefined
  const session = state?.session
  const quiz = state?.quiz

  const [displayPct, setDisplayPct] = useState(0)
  const animRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)

  useEffect(() => {
    if (!session) return
    const target = session.score
    const start = performance.now()
    const duration = 1200
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayPct(Math.round(eased * target))
      if (progress < 1) animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [session])

  if (!session || !quiz) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Session not found.</p>
          <Button onClick={() => navigate('/home')}>Back to Home</Button>
        </div>
      </div>
    )
  }

  const passed = session.isPassed ?? session.score >= (quiz.settings.passingScore ?? 0)

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="px-6 py-4 border-b border-slate-700 text-center">
        <h1 className="text-lg font-semibold">{quiz.title}</h1>
        <p className="text-sm text-slate-400">{session.playerName}</p>
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
          <Badge variant={passed ? 'success' : 'error'} className="text-sm px-4 py-1.5">
            {passed ? 'СДАЛ' : 'НЕ СДАЛ'}
          </Badge>
          {session.streakData.maxStreak >= 2 && (
            <StreakBadge streak={session.streakData.maxStreak} />
          )}
        </div>

        {session.answers.length > 0 && (
          <div className="w-full mb-8">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Ответы по вопросам</h2>
            <div className="flex flex-col gap-2">
              {session.answers.map((answer, i) => {
                const question = quiz.questions.find((q) => q.id === answer.questionId)
                return (
                  <div
                    key={answer.questionId}
                    className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-slate-200 flex-1">
                        <span className="text-slate-500 mr-2">Q{i + 1}</span>
                        {question?.text ?? 'Вопрос удалён'}
                      </p>
                      <span
                        className={`text-lg font-bold ${
                          answer.isCorrect ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {answer.isCorrect ? '\u2713' : '\u2717'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {answer.pointsEarned} балл· {Math.round(answer.responseTimeMs / 1000)}с</p>
                    </p>
                    {!answer.isCorrect && question?.explanation && (
                      <AnswerFeedback
                        correct={false}
                        explanation={question.explanation}
                        className="mt-2 text-sm"
                      />
                    )}
                  </div>
                )
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
            onClick={() => navigate('/home')}
          >
            На главную
          </Button>
        </div>
      </main>
    </div>
  )
}
