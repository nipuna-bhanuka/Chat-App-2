import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { AppLayout } from '@/components/layout/AppLayout'
import { Spinner } from '@/components/ui/Spinner'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const ChatPage = lazy(() => import('@/pages/ChatPage'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const About = lazy(() => import('@/pages/About'))

function RouteFallback() {
  return <Spinner label="Loading page" />
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="about" element={<About />} />
            </Route>
            <Route path="chat/:scenarioId" element={<ChatPage />} />
            <Route path="scenarios" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
