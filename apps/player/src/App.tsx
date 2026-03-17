import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { HomePage } from './pages/HomePage.tsx'
import { QuizPage } from './pages/QuizPage.tsx'
import { ResultsPage } from './pages/ResultsPage.tsx'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        {/* Home — pick a quiz pack, enter player name */}
        <Route path="/home" element={<HomePage />} />
        {/* Active quiz session */}
        <Route path="/quiz/:packId" element={<QuizPage />} />
        {/* Results screen after completing a quiz */}
        <Route path="/results/:sessionId" element={<ResultsPage />} />
      </Routes>
    </BrowserRouter>
  )
}
