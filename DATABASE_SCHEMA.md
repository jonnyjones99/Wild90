# Database Schema for Wild90 Bug Scanner

This document outlines the database schema needed for the Wild90 POC app. Run these SQL commands in your Supabase SQL editor.

## Tables

### 1. `bugs` - Bug Catalog
Stores information about different bugs that can be scanned.

```sql
CREATE TABLE bugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  scientific_name TEXT NOT NULL,
  description TEXT,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  points INTEGER NOT NULL DEFAULT 10,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add some sample bugs
INSERT INTO bugs (name, scientific_name, rarity, points) VALUES
  ('Monarch Butterfly', 'Danaus plexippus', 'common', 10),
  ('Honeybee', 'Apis mellifera', 'common', 15),
  ('Dragonfly', 'Odonata', 'uncommon', 25),
  ('Ladybug', 'Coccinellidae', 'common', 10),
  ('Firefly', 'Lampyridae', 'uncommon', 30),
  ('Praying Mantis', 'Mantodea', 'rare', 50);
```

### 2. `user_profiles` - User Profile Data
Extends the auth.users table with game-specific data.

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT,
  total_score INTEGER DEFAULT 0,
  bugs_scanned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### 3. `bug_scans` - Scan History
Tracks when users scan bugs.

```sql
CREATE TABLE bug_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bug_id UUID NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bug_scans ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own scans
CREATE POLICY "Users can view own scans"
  ON bug_scans FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own scans
CREATE POLICY "Users can insert own scans"
  ON bug_scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_bug_scans_user_id ON bug_scans(user_id);
CREATE INDEX idx_bug_scans_bug_id ON bug_scans(bug_id);
```

### 4. `badges` - Badge Definitions
Defines available badges and their requirements.

```sql
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('scan_count', 'bug_type', 'score_threshold', 'special')),
  requirement_value TEXT NOT NULL, -- JSON or number as text
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add some sample badges
INSERT INTO badges (name, description, requirement_type, requirement_value) VALUES
  ('First Scan', 'Scan your first bug!', 'scan_count', '1'),
  ('Bug Collector', 'Scan 10 different bugs', 'scan_count', '10'),
  ('Master Collector', 'Scan 50 bugs', 'scan_count', '50'),
  ('High Scorer', 'Reach 100 points', 'score_threshold', '100'),
  ('Butterfly Lover', 'Scan 5 butterflies', 'bug_type', '{"type": "butterfly", "count": 5}');
```

### 5. `user_badges` - Earned Badges
Tracks which badges users have earned.

```sql
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own badges
CREATE POLICY "Users can view own badges"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: System can insert badges (you may want to use a service role for this)
CREATE POLICY "Users can view all badges"
  ON user_badges FOR SELECT
  USING (true);

-- Index for faster queries
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON user_badges(badge_id);
```

## Functions

### Function to increment user score
```sql
CREATE OR REPLACE FUNCTION increment_user_score(
  user_id UUID,
  points INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_profiles
  SET 
    total_score = total_score + points,
    bugs_scanned = bugs_scanned + 1,
    updated_at = NOW()
  WHERE id = user_id;
END;
$$;
```

### Function to check and award badges
```sql
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
  -- Get user stats
  SELECT bugs_scanned, total_score
  INTO v_scan_count, v_total_score
  FROM user_profiles
  WHERE id = p_user_id;

  -- Check scan count badges
  INSERT INTO user_badges (user_id, badge_id)
  SELECT p_user_id, id
  FROM badges
  WHERE requirement_type = 'scan_count'
    AND requirement_value::INTEGER <= v_scan_count
    AND id NOT IN (
      SELECT badge_id FROM user_badges WHERE user_id = p_user_id
    );

  -- Check score threshold badges
  INSERT INTO user_badges (user_id, badge_id)
  SELECT p_user_id, id
  FROM badges
  WHERE requirement_type = 'score_threshold'
    AND requirement_value::INTEGER <= v_total_score
    AND id NOT IN (
      SELECT badge_id FROM user_badges WHERE user_id = p_user_id
    );
END;
$$;
```

## Triggers

### Auto-update updated_at timestamp
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Auto-check badges after scan
```sql
CREATE OR REPLACE FUNCTION trigger_check_badges()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_and_award_badges(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_badges_after_scan
  AFTER INSERT ON bug_scans
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_badges();
```

## Notes

1. **Row Level Security (RLS)**: All tables have RLS enabled to ensure users can only access their own data.

2. **Authentication**: The app uses Supabase Auth, which automatically creates entries in `auth.users`. The `user_profiles` table extends this with game-specific data.

3. **Badge System**: Badges are automatically checked after each scan via a trigger. You can extend the `check_and_award_badges` function to handle more complex badge requirements.

4. **Image Storage**: For production, you should upload images to Supabase Storage and store the public URL in the `image_url` fields.

5. **Location Data**: The `bug_scans` table includes optional location fields for future features like location-based badges or bug distribution maps.

