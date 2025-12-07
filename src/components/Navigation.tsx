import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Navigation.css'

export function Navigation() {
  const { signOut } = useAuth()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <Link to="/">Wild90</Link>
      </div>
      <div className="nav-links">
        <Link
          to="/scan"
          className={isActive('/scan') ? 'active' : ''}
        >
          Scan
        </Link>
        <Link
          to="/profile"
          className={isActive('/profile') ? 'active' : ''}
        >
          Profile
        </Link>
        <button onClick={signOut} className="nav-signout">
          Sign Out
        </button>
      </div>
    </nav>
  )
}

