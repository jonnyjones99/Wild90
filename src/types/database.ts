// Database types for Supabase
export interface Bug {
  id: string
  name: string
  scientific_name: string
  description?: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  points: number
  image_url?: string
  created_at: string
}

export interface UserProfile {
  id: string
  email: string
  username?: string
  total_score: number
  bugs_scanned: number
  created_at: string
  updated_at: string
}

export interface BugScan {
  id: string
  user_id: string
  bug_id: string
  scanned_at: string
  location_lat?: number
  location_lng?: number
  image_url?: string
  bug?: Bug
}

export interface Badge {
  id: string
  name: string
  description: string
  icon_url?: string
  requirement_type: 'scan_count' | 'bug_type' | 'score_threshold' | 'special'
  requirement_value: number | string
  created_at: string
}

export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
  badge?: Badge
}

