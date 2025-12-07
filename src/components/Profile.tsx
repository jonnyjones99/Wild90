import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { UserProfile, Badge, UserBadge } from '../types/database'
import './Profile.css'

export function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [badges, setBadges] = useState<UserBadge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadProfile()
      loadBadges()
    }
  }, [user])

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
        <h2>Your Profile</h2>
      </div>

      <div className="profile-stats">
        <div className="stat-card">
          <div className="stat-value">{profile?.total_score || 0}</div>
          <div className="stat-label">Total Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{profile?.bugs_scanned || 0}</div>
          <div className="stat-label">Bugs Scanned</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{badges.length}</div>
          <div className="stat-label">Badges Earned</div>
        </div>
      </div>

      <div className="badges-section">
        <h3>Your Badges</h3>
        {badges.length === 0 ? (
          <p className="no-badges">No badges yet. Start scanning bugs to earn badges!</p>
        ) : (
          <div className="badges-grid">
            {badges.map((userBadge) => (
              <div key={userBadge.id} className="badge-card">
                {userBadge.badge?.icon_url ? (
                  <img src={userBadge.badge.icon_url} alt={userBadge.badge.name} />
                ) : (
                  <div className="badge-icon">🏆</div>
                )}
                <div className="badge-name">{userBadge.badge?.name || 'Unknown Badge'}</div>
                <div className="badge-description">
                  {userBadge.badge?.description || ''}
                </div>
                <div className="badge-date">
                  Earned {new Date(userBadge.earned_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

