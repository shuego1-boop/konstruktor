import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import type { Quiz } from '@konstruktor/shared'
import { Button, Card, Badge, Spinner } from '@konstruktor/ui'
import { useTour } from '../context/TourContext.tsx'

export function DashboardPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { startTour } = useTour()
  const [creating, setCreating] = useState(false)

  const { data: quizzes = [], isLoading } = useQuery<Quiz[]>({
    queryKey: ['quizzes'],
    queryFn: () => invoke<Quiz[]>('list_quizzes'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invoke('delete_quiz', { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quizzes'] }),
  })

  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)

  async function handlePublish(quiz: Quiz, e: React.MouseEvent) {
    e.stopPropagation()
    const apiUrl = localStorage.getItem('api_url')
    if (!apiUrl) {
      setPublishError('Укажите URL API в настройках')
      setTimeout(() => setPublishError(null), 3000)
      return
    }
    setPublishingId(quiz.id)
    try {
      // Sync full quiz data, then mark published
      const token = localStorage.getItem('api_token') ?? ''
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      // Upsert quiz data
      await fetch(`${apiUrl}/quizzes/${quiz.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(quiz),
      })
      // Publish
      const res = await fetch(`${apiUrl}/quizzes/${quiz.id}/publish`, { method: 'POST', headers })
      if (!res.ok) throw new Error(await res.text())
      qc.invalidateQueries({ queryKey: ['quizzes'] })
    } catch (err: unknown) {
      setPublishError(err instanceof Error ? err.message : String(err))
      setTimeout(() => setPublishError(null), 4000)
    } finally {
      setPublishingId(null)
    }
  }

  async function handleCreate() {
    setCreating(true)
    try {
      const id = await invoke<string>('create_quiz')
      navigate(`/editor/${id}`)
    } finally {
      setCreating(false)
    }
  }

  const statusBadge = (quiz: Quiz) => {
    const status = (quiz as Quiz & { status?: string }).status ?? 'draft'
    if (status === 'published') return <Badge variant="success">Опубликован</Badge>
    if (status === 'draft') return <Badge variant="neutral">Черновик</Badge>
    return <Badge variant="warning">{status}</Badge>
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800" data-tour="header-title">Мои квизы</h1>
        <div className="flex gap-2">
          <button
            data-tour="nav-settings"
            className="text-sm text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => navigate('/settings')}
          >
            ⚙️ Настройки
          </button>
          <Button variant="secondary" onClick={startTour} data-tour="tour-btn">
            🎓 Обучение
          </Button>
          <Button onClick={handleCreate} loading={creating} data-tour="new-quiz">
            + Новый квиз
          </Button>
        </div>
      </header>

      <main className="p-8">
        {publishError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            ⚠️ {publishError}
          </div>
        )}
        {isLoading && (
          <div className="flex justify-center py-24">
            <Spinner size="lg" />
          </div>
        )}

        {!isLoading && quizzes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <p className="text-lg">Квизов пока нет.</p>
            <p className="text-sm mt-1">Нажмите «+ Новый квиз» чтобы начать.</p>
          </div>
        )}

        {!isLoading && quizzes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {quizzes.map((quiz, idx) => (
              <Card
                key={quiz.id}
                elevation="raised"
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/editor/${quiz.id}`)}
                {...(idx === 0 ? { 'data-tour': 'quiz-card' } : {})}
                header={
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate">{quiz.title || 'Без названия'}</span>
                    {statusBadge(quiz)}
                  </div>
                }
                footer={
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="secondary"
                      {...(idx === 0 ? { 'data-tour': 'preview-btn' } : {})}
                      onClick={(e) => { e.stopPropagation(); navigate(`/preview/${quiz.id}`) }}
                    >
                      Превью
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={publishingId === quiz.id}
                      onClick={(e) => { void handlePublish(quiz, e) }}
                    >
                      {(quiz as Quiz & { status?: string }).status === 'published' ? '☁ Обновить' : '☁ Опубликовать'}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      className="ml-auto"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('Удалить этот квиз?')) deleteMutation.mutate(quiz.id)
                      }}
                    >
                      Удалить
                    </Button>
                  </div>
                }
              >
                <p className="text-sm text-slate-500 line-clamp-2 min-h-[2.5rem]">
                  {quiz.description || 'Нет описания'}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  {quiz.questions?.length ?? 0} вопросов
                </p>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
