-- Add RLS policy to allow users to view all profiles for leaderboard
-- This allows read-only access to public profile data (scores, usernames)

CREATE POLICY "Users can view all profiles for leaderboard"
  ON user_profiles FOR SELECT
  USING (true);

