import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { UserProfile } from '../types/database'
import './Leaderboard.css'

export function Leaderboard() {
  const { user } = useAuth()
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: queryError } = await supabase
        .from('user_profiles')
        .select('id, email, username, total_score, bugs_scanned, created_at')
        .order('total_score', { ascending: false })
        .limit(100)

      if (queryError) throw queryError

      setLeaderboard(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load leaderboard')
      console.error('Error loading leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const getRank = (index: number) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `#${index + 1}`
  }

  const getUserDisplayName = (profile: UserProfile) => {
    return profile.username || profile.email?.split('@')[0] || 'Anonymous'
  }

  if (loading) {
    return (
      <div className="leaderboard">
        <div className="leaderboard-loading">Loading leaderboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="leaderboard">
        <div className="leaderboard-error">
          <p>{error}</p>
          <button onClick={loadLeaderboard} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    )
  }

  const currentUserRank = leaderboard.findIndex(p => p.id === user?.id) + 1

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <h2>🏆 Leaderboard</h2>
        <p className="leaderboard-subtitle">Top Bug Scanners</p>
      </div>

      {currentUserRank > 0 && currentUserRank > 10 && (
        <div className="user-rank-banner">
          <p>
            Your Rank: <strong>#{currentUserRank}</strong> with{' '}
            <strong>{leaderboard[currentUserRank - 1]?.total_score || 0}</strong> points
          </p>
        </div>
      )}

      <div className="leaderboard-list">
        {leaderboard.length === 0 ? (
          <div className="empty-leaderboard">
            <p>No scores yet. Be the first to scan a bug!</p>
          </div>
        ) : (
          leaderboard.map((profile, index) => {
            const isCurrentUser = profile.id === user?.id
            return (
              <div
                key={profile.id}
                className={`leaderboard-item ${isCurrentUser ? 'current-user' : ''}`}
              >
                <div className="rank">{getRank(index)}</div>
                <div className="user-info">
                  <div className="user-name">
                    {getUserDisplayName(profile)}
                    {isCurrentUser && <span className="you-badge">You</span>}
                  </div>
                  <div className="user-stats">
                    <span className="stat">
                      🐛 {profile.bugs_scanned} bugs
                    </span>
                  </div>
                </div>
                <div className="score">{profile.total_score.toLocaleString()}</div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

