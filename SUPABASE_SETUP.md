# Supabase Setup Guide

Follow these steps to set up your Supabase backend for Wild90.

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Click on **Settings** (gear icon) in the left sidebar
3. Click on **API** in the settings menu
4. You'll see:
   - **Project URL** - Copy this (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** - Copy this (starts with `eyJ...`)

## Step 2: Set Up Environment Variables

1. In your project root, create a `.env` file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your credentials:
   ```env
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

   Replace the values with your actual Project URL and anon key from Step 1.

## Step 3: Set Up the Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (in the left sidebar)
2. Click **New Query**
3. Open the file `supabase_setup.sql` from this project
4. Copy the entire contents of `supabase_setup.sql`
5. Paste it into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)

You should see "Success. No rows returned" - this means everything was created successfully!

## Step 4: Verify the Setup

1. Go to **Table Editor** in your Supabase dashboard
2. You should see these tables:
   - `bugs` (should have 6 sample bugs)
   - `badges` (should have 5 sample badges)
   - `user_profiles` (empty until users sign up)
   - `bug_scans` (empty until users scan bugs)
   - `user_badges` (empty until users earn badges)

## Step 5: Test the Connection

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Open the app in your browser
3. Try signing up with a new account
4. You should be able to:
   - Sign up/Sign in
   - Access the camera scanner
   - Scan bugs (mock detection for now)
   - See your profile with scores

## Troubleshooting

### "Invalid API key" error
- Double-check your `.env` file has the correct values
- Make sure there are no extra spaces or quotes
- Restart your dev server after changing `.env`

### "relation does not exist" error
- Make sure you ran the entire `supabase_setup.sql` script
- Check the Table Editor to see which tables exist
- Try running the SQL script again (it uses `IF NOT EXISTS` so it's safe)

### RLS (Row Level Security) errors
- The policies should be created automatically by the script
- Check in **Authentication** > **Policies** in Supabase dashboard
- Make sure policies exist for `user_profiles`, `bug_scans`, and `user_badges`

### Function errors
- Check **Database** > **Functions** in Supabase dashboard
- You should see `increment_user_score` and `check_and_award_badges`
- If missing, run just the Functions section from the SQL script again

## Next Steps

Once everything is working:
1. ✅ Test user registration and login
2. ✅ Test scanning bugs (will use mock detection)
3. ✅ Check that scores are updating
4. ✅ Verify badges are being awarded

You're all set! 🎉

