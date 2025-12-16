import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Auth } from './components/Auth'
import { PasswordReset } from './components/PasswordReset'
import { Navigation } from './components/Navigation'
import { CameraScanner } from './components/CameraScanner'
import { Profile } from './components/Profile'
import { Leaderboard } from './components/Leaderboard'
import { Pokedex } from './components/Pokedex'
import { Quests } from './components/Quests'
import { ProfileButton } from './components/ProfileButton'
import './App.css'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="loading-screen">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}

function AppLayout() {
  return (
    <div className="app-layout">
      <ProfileButton />
      <main className="app-main">
        <Routes>
          <Route path="/scan" element={<CameraScanner />} />
          <Route path="/pokedex" element={<Pokedex />} />
          <Route path="/quests" element={<Quests />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/" element={<Navigate to="/scan" replace />} />
        </Routes>
      </main>
      <Navigation />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<PasswordReset />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
