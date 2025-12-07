-- ============================================
-- Wild90 Database Setup Script
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- 1. Create bugs table
CREATE TABLE IF NOT EXISTS bugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  scientific_name TEXT NOT NULL,
  description TEXT,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  points INTEGER NOT NULL DEFAULT 10,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT,
  total_score INTEGER DEFAULT 0,
  bugs_scanned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create bug_scans table
CREATE TABLE IF NOT EXISTS bug_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bug_id UUID NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create badges table
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('scan_count', 'bug_type', 'score_threshold', 'special')),
  requirement_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create user_badges table
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- ============================================
-- Enable Row Level Security
-- ============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for user_profiles
-- ============================================

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- RLS Policies for bug_scans
-- ============================================

CREATE POLICY "Users can view own scans"
  ON bug_scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scans"
  ON bug_scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- RLS Policies for user_badges
-- ============================================

CREATE POLICY "Users can view own badges"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to view all badge definitions (read-only)
CREATE POLICY "Users can view all badge definitions"
  ON badges FOR SELECT
  USING (true);

-- ============================================
-- Indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_bug_scans_user_id ON bug_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_bug_scans_bug_id ON bug_scans(bug_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);

-- ============================================
-- Functions
-- ============================================

-- Function to increment user score
CREATE OR REPLACE FUNCTION increment_user_score(
  user_id UUID,
  points INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update or insert user profile
  INSERT INTO user_profiles (id, email, total_score, bugs_scanned)
  VALUES (user_id, (SELECT email FROM auth.users WHERE id = user_id), points, 1)
  ON CONFLICT (id) DO UPDATE
  SET 
    total_score = user_profiles.total_score + points,
    bugs_scanned = user_profiles.bugs_scanned + 1,
    updated_at = NOW();
END;
$$;

-- Function to check and award badges
CREATE OR REPLACE FUNCTION check_and_award_badges(
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scan_count INTEGER;
  v_total_score INTEGER;
BEGIN
  -- Get user stats (create profile if doesn't exist)
  SELECT COALESCE(bugs_scanned, 0), COALESCE(total_score, 0)
  INTO v_scan_count, v_total_score
  FROM user_profiles
  WHERE id = p_user_id;

  -- If profile doesn't exist, initialize it
  IF v_scan_count IS NULL THEN
    INSERT INTO user_profiles (id, email, total_score, bugs_scanned)
    VALUES (p_user_id, (SELECT email FROM auth.users WHERE id = p_user_id), 0, 0)
    ON CONFLICT (id) DO NOTHING;
    
    SELECT 0, 0 INTO v_scan_count, v_total_score;
  END IF;

  -- Check scan count badges
  INSERT INTO user_badges (user_id, badge_id)
  SELECT p_user_id, id
  FROM badges
  WHERE requirement_type = 'scan_count'
    AND requirement_value::INTEGER <= v_scan_count
    AND id NOT IN (
      SELECT badge_id FROM user_badges WHERE user_id = p_user_id
    )
  ON CONFLICT (user_id, badge_id) DO NOTHING;

  -- Check score threshold badges
  INSERT INTO user_badges (user_id, badge_id)
  SELECT p_user_id, id
  FROM badges
  WHERE requirement_type = 'score_threshold'
    AND requirement_value::INTEGER <= v_total_score
    AND id NOT IN (
      SELECT badge_id FROM user_badges WHERE user_id = p_user_id
    )
  ON CONFLICT (user_id, badge_id) DO NOTHING;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to trigger badge checking
CREATE OR REPLACE FUNCTION trigger_check_badges()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_and_award_badges(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Triggers
-- ============================================

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER check_badges_after_scan
  AFTER INSERT ON bug_scans
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_badges();

-- ============================================
-- Seed Data
-- ============================================

-- Insert sample bugs
INSERT INTO bugs (name, scientific_name, rarity, points) VALUES
  ('Monarch Butterfly', 'Danaus plexippus', 'common', 10),
  ('Honeybee', 'Apis mellifera', 'common', 15),
  ('Dragonfly', 'Odonata', 'uncommon', 25),
  ('Ladybug', 'Coccinellidae', 'common', 10),
  ('Firefly', 'Lampyridae', 'uncommon', 30),
  ('Praying Mantis', 'Mantodea', 'rare', 50)
ON CONFLICT DO NOTHING;

-- Insert sample badges
INSERT INTO badges (name, description, requirement_type, requirement_value) VALUES
  ('First Scan', 'Scan your first bug!', 'scan_count', '1'),
  ('Bug Collector', 'Scan 10 different bugs', 'scan_count', '10'),
  ('Master Collector', 'Scan 50 bugs', 'scan_count', '50'),
  ('High Scorer', 'Reach 100 points', 'score_threshold', '100'),
  ('Butterfly Lover', 'Scan 5 butterflies', 'bug_type', '{"type": "butterfly", "count": 5}')
ON CONFLICT DO NOTHING;

