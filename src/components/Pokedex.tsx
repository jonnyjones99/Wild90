import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { Bug } from '../types/database'
import './Pokedex.css'

export function Pokedex() {
  const { user } = useAuth()
  const [bugs, setBugs] = useState<Bug[]>([])
  const [scannedBugIds, setScannedBugIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'collected' | 'uncollected'>('all')
  const [rarityFilter, setRarityFilter] = useState<string>('all')

  useEffect(() => {
    if (user) {
      loadBugs()
      loadScannedBugs()
    }
  }, [user])

  const loadBugs = async () => {
    try {
      const { data, error } = await supabase
        .from('bugs')
        .select('*')
        .order('rarity', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      setBugs(data || [])
    } catch (err) {
      console.error('Error loading bugs:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadScannedBugs = async () => {
    if (!user) return

    try {
      // Get distinct bug IDs that the user has scanned
      const { data, error } = await supabase
        .from('bug_scans')
        .select('bug_id')
        .eq('user_id', user.id)

      if (error) throw error
      
      // Use Set to ensure uniqueness (in case of duplicate scans)
      const scannedIds = new Set((data || []).map(scan => scan.bug_id))
      setScannedBugIds(scannedIds)
    } catch (err) {
      console.error('Error loading scanned bugs:', err)
    }
  }

  const isCollected = (bugId: string) => scannedBugIds.has(bugId)

  const getFilteredBugs = () => {
    let filtered = bugs

    // Filter by collection status
    if (filter === 'collected') {
      filtered = filtered.filter(bug => isCollected(bug.id))
    } else if (filter === 'uncollected') {
      filtered = filtered.filter(bug => !isCollected(bug.id))
    }

    // Filter by rarity
    if (rarityFilter !== 'all') {
      filtered = filtered.filter(bug => bug.rarity === rarityFilter)
    }

    return filtered
  }

  const collectedCount = bugs.filter(bug => isCollected(bug.id)).length
  const totalCount = bugs.length
  const completionPercentage = totalCount > 0 ? Math.round((collectedCount / totalCount) * 100) : 0

  if (loading) {
    return (
      <div className="pokedex">
        <div className="pokedex-loading">Loading bugs...</div>
      </div>
    )
  }

  const filteredBugs = getFilteredBugs()

  return (
    <div className="pokedex">
      <div className="pokedex-header">
        <h1>BugDex</h1>
        <div className="pokedex-stats">
          <div className="completion-badge">
            <span className="completion-number">{collectedCount}</span>
            <span className="completion-total">/{totalCount}</span>
          </div>
          <div className="completion-bar">
            <div 
              className="completion-fill" 
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <span className="completion-text">{completionPercentage}% Complete</span>
        </div>
      </div>

      <div className="pokedex-filters">
        <div className="filter-group">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filter === 'collected' ? 'active' : ''}`}
            onClick={() => setFilter('collected')}
          >
            Collected
          </button>
          <button
            className={`filter-btn ${filter === 'uncollected' ? 'active' : ''}`}
            onClick={() => setFilter('uncollected')}
          >
            Missing
          </button>
        </div>
        <select
          className="rarity-filter"
          value={rarityFilter}
          onChange={(e) => setRarityFilter(e.target.value)}
        >
          <option value="all">All Rarities</option>
          <option value="common">Common</option>
          <option value="uncommon">Uncommon</option>
          <option value="rare">Rare</option>
          <option value="epic">Epic</option>
          <option value="legendary">Legendary</option>
        </select>
      </div>

      <div className="pokedex-grid">
        {filteredBugs.length === 0 ? (
          <div className="pokedex-empty">
            <div className="empty-icon">🐛</div>
            <p>No bugs found with these filters</p>
          </div>
        ) : (
          filteredBugs.map((bug) => {
            const collected = isCollected(bug.id)
            return (
              <div
                key={bug.id}
                className={`bug-card ${collected ? 'collected' : 'uncollected'}`}
              >
                <div className="bug-card-inner">
                  {collected ? (
                    <>
                      {bug.image_url ? (
                        <img
                          src={bug.image_url}
                          alt={bug.name}
                          className="bug-image"
                        />
                      ) : (
                        <div className="bug-image-placeholder">🐛</div>
                      )}
                      <div className="bug-info">
                        <h3 className="bug-name">{bug.name}</h3>
                        <p className="bug-scientific">{bug.scientific_name}</p>
                        <div className="bug-details">
                          <span className={`rarity-badge rarity-${bug.rarity}`}>
                            {bug.rarity}
                          </span>
                          <span className="bug-points">⭐ {bug.points}</span>
                        </div>
                        {bug.description && (
                          <p className="bug-description">{bug.description}</p>
                        )}
                      </div>
                      <div className="collected-badge">✓ Collected</div>
                    </>
                  ) : (
                    <>
                      <div className="bug-silhouette">
                        <div className="silhouette-icon">❓</div>
                      </div>
                      <div className="bug-info">
                        <h3 className="bug-name unknown">???</h3>
                        <p className="bug-scientific unknown">Unknown Bug</p>
                        <div className="bug-details">
                          <span className="rarity-badge rarity-unknown">?</span>
                        </div>
                      </div>
                      <div className="uncollected-badge">Not Found</div>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
