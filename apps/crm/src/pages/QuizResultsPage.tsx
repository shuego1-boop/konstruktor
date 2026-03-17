import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'

type SessionRow = {
  id: string
  playerName: string
  score: number
  isPassed: boolean | null
  earnedPoints: number
  totalPoints: number
  startedAt: string
  completedAt: string | null
}

type QuizStats = {
  quizTitle: string
  totalSessions: number
  averageScore: number
  passRate: number
  sessions: SessionRow[]
}

const col = createColumnHelper<SessionRow>()

const columns = [
  col.accessor('playerName', { header: 'Ученик' }),
  col.accessor('score', {
    header: 'Балл',
    cell: (info) => `${info.getValue()}%`,
  }),
  col.accessor('isPassed', {
    header: 'Статус',
    cell: (info) => {
      const v = info.getValue()
      if (v === null) return <span className="text-slate-400">—</span>
      return v ? (
        <span className="text-green-600 font-medium">Сдал</span>
      ) : (
        <span className="text-red-500 font-medium">Не сдал</span>
      )
    },
  }),
  col.accessor('startedAt', {
    header: 'Дата',
    cell: (info) => new Date(info.getValue()).toLocaleDateString('ru-RU'),
  }),
]

export function QuizResultsPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery<QuizStats>({
    queryKey: ['quiz-results', quizId],
    queryFn: async () => {
      const res = await fetch(`/api/quizzes/${quizId}/sessions`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load results')
      return (await res.json()) as QuizStats
    },
    enabled: !!quizId,
  })

  const table = useReactTable({
    data: data?.sessions ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

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
          {data?.quizTitle ?? 'Результаты'}
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
                { label: 'Попыток', value: data.totalSessions },
                { label: 'Ср. балл', value: `${data.averageScore}%` },
                { label: 'Сдало', value: `${data.passRate}%` },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>

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
                          {flexRender(header.column.columnDef.header, header.getContext())}
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
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.sessions.length === 0 && (
                <p className="p-8 text-center text-slate-400">\u041d\u0435\u0442 \u0437\u0430\u043f\u0438\u0441\u0435\u0439</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

