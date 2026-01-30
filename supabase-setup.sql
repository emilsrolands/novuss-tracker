-- Run this in Supabase SQL Editor
-- Go to: SQL Editor → New Query → Paste this → Click "Run"

-- Create games table
CREATE TABLE games (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE NOT NULL,
  winner TEXT NOT NULL CHECK (winner IN ('p1', 'p2')),
  note TEXT
);

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Allow all operations (public access - no auth needed)
CREATE POLICY "Allow all on games" ON games FOR ALL USING (true) WITH CHECK (true);

-- Index for better performance
CREATE INDEX games_date_idx ON games(date DESC);
