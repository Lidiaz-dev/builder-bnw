import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import ArmyListPage from './pages/ArmyListPage'
import ArmyBuilderPage from './pages/ArmyBuilderPage'
import ArmySheetsPage from './pages/ArmySheetsPage'
import RulesPage from './pages/RulesPage'
import GamePage from './pages/GamePage'

function RequireAuth({ children }: { children: ReactNode }) {
  const { localMode, user, loading } = useAuth()
  if (localMode) return children
  if (loading) return <p className="muted center">Chargement…</p>
  return user ? children : <LoginPage />
}

function Header() {
  const { localMode, user, signOut } = useAuth()
  return (
    <header className="site-header no-print">
      <NavLink to="/" className="brand">
        <span className="brand-mark" aria-hidden>
          ◎
        </span>
        Brave New World
      </NavLink>
      <nav>
        <NavLink to="/listes">Listes</NavLink>
        <NavLink to="/partie">Partie</NavLink>
        <NavLink to="/regles">Règles</NavLink>
      </nav>
      <div className="header-user">
        {localMode ? (
          <span className="pill" title="Les comptes ne sont pas encore branchés : les listes sont enregistrées dans ce navigateur uniquement.">
            Mode local
          </span>
        ) : user ? (
          <>
            <span className="muted small header-email">{user.email}</span>
            <button className="btn ghost small" onClick={signOut}>
              Déconnexion
            </button>
          </>
        ) : null}
      </div>
    </header>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Header />
        <main className="page">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/listes" element={<RequireAuth><ArmyListPage /></RequireAuth>} />
            <Route path="/listes/:id" element={<RequireAuth><ArmyBuilderPage /></RequireAuth>} />
            <Route path="/listes/:id/fiches" element={<RequireAuth><ArmySheetsPage /></RequireAuth>} />
            <Route path="/regles/*" element={<RulesPage />} />
            <Route path="/partie" element={<GamePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </HashRouter>
    </AuthProvider>
  )
}
