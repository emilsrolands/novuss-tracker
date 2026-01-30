# Novuss Tracker

A simple, beautiful score tracker for Novuss games between two players.

## Features

- **Authentication** - Simple login for Emils and Pēteris
- **Score Tracking** - Track wins with optional notes
- **Statistics** - All-time, weekly, monthly breakdowns
- **Analytics** - Win rate trends, streaks, monthly chart
- **Achievements** - Personal milestones (First Blood, Hat Trick, Comeback Kid, etc.)
- **Dark Mode** - Toggle between light and dark themes
- **Responsive** - Works on desktop and mobile

## Tech Stack

- React + Vite
- Tailwind CSS
- Supabase (PostgreSQL database)
- Vercel (hosting)

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/emilsrolands/novuss-tracker.git
cd novuss-tracker
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run:

```sql
CREATE TABLE games (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE NOT NULL,
  winner TEXT NOT NULL CHECK (winner IN ('p1', 'p2')),
  note TEXT
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on games" ON games FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX games_date_idx ON games(date DESC);
```

3. Copy your project URL and anon key from Settings > API

### 3. Configure environment variables

Create a `.env` file:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Run locally

```bash
npm run dev
```

### 5. Deploy to Vercel

1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## Login Credentials

- **Emils**: `emils` / `emils123`
- **Pēteris**: `peteris` / `peteris123`

## License

MIT
