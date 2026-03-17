import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Input, Card } from '@konstruktor/ui'

export function SettingsPage() {
  const navigate = useNavigate()
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('api_url') ?? '')
  const [apiToken, setApiToken] = useState(() => localStorage.getItem('api_token') ?? '')
  const [aiKey, setAiKey] = useState(() => localStorage.getItem('konstruktor_ai_key') ?? '')
  const [savedSync, setSavedSync] = useState(false)
  const [savedAi, setSavedAi] = useState(false)

  function handleSaveSync(e: React.FormEvent) {
    e.preventDefault()
    localStorage.setItem('api_url', apiUrl)
    localStorage.setItem('api_token', apiToken)
    setSavedSync(true)
    setTimeout(() => setSavedSync(false), 2000)
  }

  function handleSaveAi(e: React.FormEvent) {
    e.preventDefault()
    localStorage.setItem('konstruktor_ai_key', aiKey)
    setSavedAi(true)
    setTimeout(() => setSavedAi(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="flex items-center gap-4 mb-6">
        <button
          className="text-sm text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          onClick={() => navigate('/dashboard')}
        >
          ← Назад
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Настройки</h1>
      </div>
      <div className="max-w-lg flex flex-col gap-6">
        <Card elevation="raised" header="☁️ Облачная синхронизация">
          <form onSubmit={handleSaveSync} className="flex flex-col gap-4">
            <Input
              label="URL API"
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.yourdomain.com"
              hint="Адрес облачного API. После ввода квизы можно публиковать кнопкой ☁ на дашборде."
            />
            <Input
              label="Токен (Bearer)"
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="eyJ..."
              hint="JWT токен для авторизации. Получите после входа через веб-интерфейс."
            />
            <Button type="submit" variant={savedSync ? 'secondary' : 'primary'}>
              {savedSync ? '✓ Сохранено!' : 'Сохранить'}
            </Button>
          </form>
        </Card>

        <Card elevation="raised" header="✨ AI-генерация фонов (AI Tunnel)">
          <form onSubmit={handleSaveAi} className="flex flex-col gap-4">
            <Input
              label="API ключ (sk-aitunnel-...)"
              type="password"
              value={aiKey}
              onChange={(e) => setAiKey(e.target.value)}
              placeholder="sk-aitunnel-..."
              hint="Ключ с aitunnel.ru для генерации тематических фонов через DALL-E 3. Хранится только локально."
            />
            <Button type="submit" variant={savedAi ? 'secondary' : 'primary'}>
              {savedAi ? '✓ Сохранено!' : 'Сохранить'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

