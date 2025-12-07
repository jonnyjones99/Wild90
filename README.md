# Wild90 - Bug Scanner PWA

A multiplayer Progressive Web App (PWA) for scanning bugs, earning scores, and collecting badges. Built with React, TypeScript, Vite, and Supabase.

## Features

- 📸 **Camera Scanner**: Use your device's camera to scan bugs
- 🎯 **Scoring System**: Earn points for each bug you scan
- 🏆 **Badge Collection**: Unlock badges as you progress
- 👤 **User Profiles**: Track your total score and bugs scanned
- 🔐 **Authentication**: Secure user accounts with Supabase Auth
- 📱 **PWA Support**: Install as an app on your device

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Backend**: Supabase (Auth, Database, Storage)
- **Routing**: React Router
- **PWA**: Vite PWA Plugin

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy your Project URL and anon/public key

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can use `.env.example` as a template.

### 4. Set Up Database Schema

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Run the SQL commands from `DATABASE_SCHEMA.md` to create all necessary tables, functions, and triggers

### 5. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 6. Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/          # React components
│   ├── Auth.tsx       # Authentication UI
│   ├── CameraScanner.tsx # Camera and scanning functionality
│   ├── Profile.tsx     # User profile and badges
│   └── Navigation.tsx  # App navigation
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication state management
├── lib/               # Utilities and configurations
│   └── supabase.ts    # Supabase client setup
└── types/             # TypeScript type definitions
    └── database.ts    # Database type definitions
```

## Database Schema

See `DATABASE_SCHEMA.md` for complete database setup instructions including:
- Tables: `bugs`, `user_profiles`, `bug_scans`, `badges`, `user_badges`
- Functions: Score increment, badge checking
- Triggers: Auto-update timestamps, badge awards

## POC Notes

This is a Proof of Concept application. Current limitations:

1. **Bug Detection**: Currently uses mock/random bug detection. In future maybe:
   - ML models (TensorFlow.js, ONNX.js)
   - Computer vision APIs
   - Custom image recognition services

2. **Image Storage**: Images are stored as base64 in db. will need something like this:
   - Upload images to Supabase Storage
   - Store public URLs in the database
   - Implement image compression

3. **Badge System**: Basic badge checking is implemented. Extend the `check_and_award_badges` function for more complex requirements.

## Future Enhancements

- [ ] Real ML-based bug identification
- [ ] Leaderboard system
- [ ] Social features (share scans, follow friends)
- [ ] Location-based features
- [ ] Bug encyclopedia
- [ ] Push notifications for new badges
- [ ] Offline mode with sync