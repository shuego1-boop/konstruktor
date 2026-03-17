import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardPage } from './pages/DashboardPage.tsx'
import { QuizEditorPage } from './pages/QuizEditorPage.tsx'
import { PreviewPage } from './pages/PreviewPage.tsx'
import { SettingsPage } from './pages/SettingsPage.tsx'
import { TourProvider } from './context/TourContext.tsx'
import { AppTour } from './components/AppTour.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TourProvider>
        <BrowserRouter>
          <AppTour />
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/editor/:quizId" element={<QuizEditorPage />} />
            <Route path="/preview/:quizId" element={<PreviewPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </BrowserRouter>
      </TourProvider>
    </QueryClientProvider>
  )
}
