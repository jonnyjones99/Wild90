import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { BugScan } from '../types/database'
import './CommunityChallenges.css'

interface Challenge {
  id: string
  name: string
  description: string
  target: number
  bugType?: string // Optional: specific bug name or type to filter
  icon: string
  color: string
}

const CHALLENGES: Challenge[] = [
  {
    id: 'butterfly-challenge',
    name: 'Butterfly Migration',
    description: 'Help the community scan 30 butterflies',
    target: 30,
    bugType: 'butterfly', // Will match bugs with "butterfly" in name (case-insensitive)
    icon: '🦋',
    color: 'var(--primary)',
  },
  {
    id: 'bee-challenge',
    name: 'Bee Colony',
    description: 'Scan 50 bees together',
    target: 50,
    bugType: 'bee',
    icon: '🐝',
    color: 'var(--accent)',
  },
  {
    id: 'rare-challenge',
    name: 'Rare Discovery',
    description: 'Find 20 rare or epic bugs',
    target: 20,
    bugType: 'rare', // Special type for rarity-based challenge
    icon: '✨',
    color: 'var(--nature-sage)',
  },
]

interface ChallengeProgress {
  challengeId: string
  current: number
  target: number
  userContributed: boolean
}

export function CommunityChallenges() {
  const { user } = useAuth()
  const [progress, setProgress] = useState<Map<string, ChallengeProgress>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadChallengeProgress()
  }, [user])

  const loadChallengeProgress = async () => {
    try {
      setLoading(true)
      const progressMap = new Map<string, ChallengeProgress>()

      for (const challenge of CHALLENGES) {
        let current = 0
        let userContributed = false

        if (challenge.bugType === 'rare') {
          // Count rare/epic/legendary bugs
          // First get all rare/epic/legendary bug IDs
          const { data: rareBugs, error: rareBugsError } = await supabase
            .from('bugs')
            .select('id')
            .in('rarity', ['rare', 'epic', 'legendary'])

          if (!rareBugsError && rareBugs && rareBugs.length > 0) {
            const rareBugIds = rareBugs.map(b => b.id)

            // Count distinct scans of these bugs
            const { data: scans, error: scansError } = await supabase
              .from('bug_scans')
              .select('bug_id, user_id')
              .in('bug_id', rareBugIds)

            if (!scansError && scans) {
              // Count distinct bug IDs scanned
              const distinctBugs = new Set(scans.map(scan => scan.bug_id))
              current = distinctBugs.size

              // Check if current user contributed
              if (user) {
                userContributed = scans.some(scan => 
                  scan.user_id === user.id && rareBugIds.includes(scan.bug_id)
                )
              }
            }
          }
        } else {
          // Count specific bug type
          const { data: bugs, error: bugsError } = await supabase
            .from('bugs')
            .select('id, name')
            .ilike('name', `%${challenge.bugType}%`)

          if (!bugsError && bugs && bugs.length > 0) {
            const bugIds = bugs.map(b => b.id)

            // Count distinct scans of these bugs
            const { data: scans, error: scansError } = await supabase
              .from('bug_scans')
              .select('bug_id, user_id')
              .in('bug_id', bugIds)

            if (!scansError && scans) {
              // Count distinct bug IDs scanned
              const distinctBugs = new Set(scans.map(scan => scan.bug_id))
              current = distinctBugs.size

              // Check if current user contributed
              if (user) {
                userContributed = scans.some(scan => 
                  scan.user_id === user.id && bugIds.includes(scan.bug_id)
                )
              }
            }
          }
        }

        progressMap.set(challenge.id, {
          challengeId: challenge.id,
          current,
          target: challenge.target,
          userContributed,
        })
      }

      setProgress(progressMap)
    } catch (err) {
      console.error('Error loading challenge progress:', err)
    } finally {
      setLoading(false)
    }
  }

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100)
  }

  if (loading) {
    return (
      <div className="community-challenges">
        <div className="challenges-loading">Loading challenges...</div>
      </div>
    )
  }

  return (
    <div className="community-challenges">
      <div className="challenges-header">
        <h2>🌍 Community Challenges</h2>
        <p className="challenges-subtitle">Work together to reach these goals!</p>
      </div>

      <div className="challenges-list">
        {CHALLENGES.map((challenge) => {
          const challengeProgress = progress.get(challenge.id)
          if (!challengeProgress) return null

          const { current, target, userContributed } = challengeProgress
          const percentage = getProgressPercentage(current, target)
          const isComplete = current >= target

          return (
            <div
              key={challenge.id}
              className={`challenge-card ${isComplete ? 'complete' : ''} ${userContributed ? 'user-contributed' : ''}`}
            >
              <div className="challenge-header">
                <div className="challenge-icon">{challenge.icon}</div>
                <div className="challenge-info">
                  <h3 className="challenge-name">{challenge.name}</h3>
                  <p className="challenge-description">{challenge.description}</p>
                </div>
                {userContributed && (
                  <div className="contribution-badge" title="You contributed!">
                    ✓
                  </div>
                )}
              </div>

              <div className="challenge-progress">
                <div className="progress-stats">
                  <span className="progress-current">{current}</span>
                  <span className="progress-separator">/</span>
                  <span className="progress-target">{target}</span>
                </div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: challenge.color,
                    }}
                  />
                </div>
                <div className="progress-percentage">{Math.round(percentage)}%</div>
              </div>

              {isComplete && (
                <div className="challenge-complete">
                  🎉 Challenge Complete! Great work, community!
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
