import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Navigation.css'

export function Navigation() {
  const { signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) => location.pathname === path

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

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
          to="/leaderboard"
          className={`nav-item ${isActive('/leaderboard') ? 'active' : ''}`}
        >
          <div className="nav-icon">🏆</div>
          <span className="nav-label">Leaderboard</span>
        </Link>
        <Link
          to="/profile"
          className={`nav-item ${isActive('/profile') ? 'active' : ''}`}
        >
          <div className="nav-icon">👤</div>
          <span className="nav-label">Profile</span>
        </Link>
      </nav>
      {/* Sign out is now in Profile component */}
    </>
  )
}

