import { Link, useLocation } from 'react-router-dom'
import './Navigation.css'

export function Navigation() {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <>
      <nav className="bottom-navigation">
        <Link
          to="/scan"
          className={`nav-item ${isActive('/scan') ? 'active' : ''}`}
        >
          <div className="nav-icon">📸</div>
          <span className="nav-label">Scan</span>
        </Link>
        <Link
          to="/pokedex"
          className={`nav-item ${isActive('/pokedex') ? 'active' : ''}`}
        >
          <div className="nav-icon">📖</div>
          <span className="nav-label">BugDex</span>
        </Link>
        <Link
          to="/quests"
          className={`nav-item ${isActive('/quests') ? 'active' : ''}`}
        >
          <div className="nav-icon">🎯</div>
          <span className="nav-label">Quests</span>
        </Link>
        <Link
          to="/leaderboard"
          className={`nav-item ${isActive('/leaderboard') ? 'active' : ''}`}
        >
          <div className="nav-icon">🏆</div>
          <span className="nav-label">Leaderboard</span>
        </Link>
      </nav>
      {/* Sign out is now in Profile component */}
    </>
  )
}

