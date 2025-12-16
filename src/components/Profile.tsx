import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { UserProfile, UserBadge } from '../types/database'
import './Profile.css'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function Profile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [badges, setBadges] = useState<UserBadge[]>([])
  const [loading, setLoading] = useState(true)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
  const installButtonRef = useRef<HTMLButtonElement>(null)

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // If no prompt available, show iOS instructions
      setShowIOSInstructions(true)
      return
    }

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }
  }

  useEffect(() => {
    if (user) {
      loadProfile()
      loadBadges()
    }
  }, [user])

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if running on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    if (isIOS) {
      setShowIOSInstructions(true)
    }

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const loadProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setProfile(data)
      } else {
        // Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            email: user.email || '',
            total_score: 0,
            bugs_scanned: 0,
          })
          .select()
          .single()

        if (createError) throw createError
        setProfile(newProfile)
      }
    } catch (err) {
      console.error('Error loading profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadBadges = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select('*, badge:badges(*)')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false })

      if (error) throw error
      setBadges(data || [])
    } catch (err) {
      console.error('Error loading badges:', err)
    }
  }

  if (loading) {
    return <div className="profile-loading">Loading profile...</div>
  }

  return (
    <div className="profile">
      <div className="profile-header">
        <h1>Profile</h1>
        <div className="profile-email">{user?.email}</div>
      </div>

      <div className="profile-stats">
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-value">{profile?.total_score?.toLocaleString() || 0}</div>
          <div className="stat-label">Total Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🐛</div>
          <div className="stat-value">{profile?.bugs_scanned || 0}</div>
          <div className="stat-label">Bugs Scanned</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-value">{badges.length}</div>
          <div className="stat-label">Badges</div>
        </div>
      </div>

      <div className="badges-section">
        <h2>Your Badges</h2>
        {badges.length === 0 ? (
          <div className="no-badges">
            <div className="no-badges-icon">🏆</div>
            <p>No badges yet</p>
            <p className="no-badges-hint">Start scanning bugs to earn badges!</p>
          </div>
        ) : (
          <div className="badges-grid">
            {badges.map((userBadge) => (
              <div key={userBadge.id} className="badge-card">
                {userBadge.badge?.icon_url ? (
                  <img src={userBadge.badge.icon_url} alt={userBadge.badge.name} className="badge-image" />
                ) : (
                  <div className="badge-icon">🏆</div>
                )}
                <div className="badge-name">{userBadge.badge?.name || 'Unknown Badge'}</div>
                <div className="badge-description">
                  {userBadge.badge?.description || ''}
                </div>
                <div className="badge-date">
                  {new Date(userBadge.earned_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pwa-section">
        <h2>Install App</h2>
        {isInstalled ? (
          <div className="pwa-installed">
            <div className="pwa-icon">✓</div>
            <p>Wild90 is installed on your device!</p>
          </div>
        ) : (
          <>
            {deferredPrompt && (
              <button
                ref={installButtonRef}
                onClick={handleInstallClick}
                className="install-button"
              >
                <span className="install-icon">📱</span>
                Add to Home Screen
              </button>
            )}
            {showIOSInstructions && (
              <div className="ios-instructions">
                <p className="ios-title">Install on iOS:</p>
                <ol className="ios-steps">
                  <li>Tap the <strong>Share</strong> button <span className="ios-icon">⎋</span> at the bottom</li>
                  <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                  <li>Tap <strong>"Add"</strong> to confirm</li>
                </ol>
                <button
                  onClick={() => setShowIOSInstructions(false)}
                  className="ios-dismiss"
                >
                  Got it
                </button>
              </div>
            )}
            {!deferredPrompt && !showIOSInstructions && (
              <div className="pwa-info">
                <p>Install Wild90 to your home screen for quick access!</p>
                <button
                  onClick={() => setShowIOSInstructions(true)}
                  className="install-button secondary"
                >
                  <span className="install-icon">ℹ️</span>
                  Show Instructions
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="profile-actions">
        <button onClick={handleSignOut} className="sign-out-button">
          Sign Out
        </button>
      </div>
    </div>
  )
}

