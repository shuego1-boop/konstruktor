import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useAuth } from '../hooks/useAuth.ts'

type QuizSummary = {
  id: string
  title: string
  subject: string | null
  status: string
  totalSessions: number
  averageScore: number
  updatedAt: string
}

export function DashboardPage() {
  const { user } = useAuth()
  const { data: quizzes, isLoading } = useQuery<QuizSummary[]>({
    queryKey: ['quizzes'],
    queryFn: async () => {
      const res = await fetch('/api/quizzes', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load quizzes')
      return (await res.json()) as QuizSummary[]
    },
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Мои квизы</h1>
        {user && <span className="text-sm text-slate-500">{user.name}</span>}
      </header>
      <main className="p-8">
        {isLoading && (
          <p className="text-slate-400">Загрузка…</p>
        )}
        {!isLoading && quizzes?.length === 0 && (
          <p className="text-slate-400">Нет квизов</p>
        )}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {quizzes?.map((quiz) => (
            <Link
              key={quiz.id}
              to={`/quiz/${quiz.id}/results`}
              className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-indigo-300"
            >
              <div className="mb-3 flex items-start justify-between">
                <h2 className="text-base font-semibold text-slate-800 group-hover:text-indigo-700 line-clamp-2">
                  {quiz.title}
                </h2>
                <span
                  className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    quiz.status === 'published'
                      ? 'bg-green-100 text-green-700'
                      : quiz.status === 'draft'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {quiz.status === 'published' ? 'опубликован' : quiz.status === 'draft' ? 'черновик' : quiz.status}
                </span>
              </div>
              {quiz.subject && (
                <p className="mb-3 text-xs text-slate-500">{quiz.subject}</p>
              )}
              <div className="flex gap-4 text-sm">
                <div>
                  <p className="text-lg font-bold text-slate-800">{quiz.totalSessions}</p>
                  <p className="text-xs text-slate-400">попыток</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800">{quiz.averageScore}%</p>
                  <p className="text-xs text-slate-400">ср. балл</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
