import { useNavigate } from 'react-router-dom'
import './ProfileButton.css'

export function ProfileButton() {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate('/profile')
  }

  return (
    <button 
      className="profile-button"
      onClick={handleClick}
      aria-label="Profile"
    >
      <div className="profile-icon">👤</div>
    </button>
  )
}
