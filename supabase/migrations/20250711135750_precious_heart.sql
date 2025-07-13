/*
  # Add comprehensive profile metrics and tracking

  1. Profile Metrics
    - Add time_spent column for tracking learning time
    - Add completed_lessons column for lesson count
    - Add last_activity column for streak calculation
    - Add daily XP tracking columns
    - Add special achievement counters

  2. Security
    - Maintain existing RLS policies
    - Update triggers for new columns
*/

-- Add new columns to profiles table
DO $$
BEGIN
  -- Time tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'time_spent'
  ) THEN
    ALTER TABLE profiles ADD COLUMN time_spent integer DEFAULT 0;
  END IF;

  -- Lesson completion tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'completed_lessons'
  ) THEN
    ALTER TABLE profiles ADD COLUMN completed_lessons integer DEFAULT 0;
  END IF;

  -- Activity tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_activity'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_activity timestamptz DEFAULT now();
  END IF;

  -- Daily XP tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'daily_xp_goal'
  ) THEN
    ALTER TABLE profiles ADD COLUMN daily_xp_goal integer DEFAULT 50;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'daily_xp_streak'
  ) THEN
    ALTER TABLE profiles ADD COLUMN daily_xp_streak integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'perfect_weeks'
  ) THEN
    ALTER TABLE profiles ADD COLUMN perfect_weeks integer DEFAULT 0;
  END IF;

  -- Special achievement counters
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'weekend_streak'
  ) THEN
    ALTER TABLE profiles ADD COLUMN weekend_streak integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'night_owl_sessions'
  ) THEN
    ALTER TABLE profiles ADD COLUMN night_owl_sessions integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'early_bird_sessions'
  ) THEN
    ALTER TABLE profiles ADD COLUMN early_bird_sessions integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'speed_learner_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN speed_learner_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'consistent_days'
  ) THEN
    ALTER TABLE profiles ADD COLUMN consistent_days integer DEFAULT 0;
  END IF;
END $$;

-- Add level calculation function
CREATE OR REPLACE FUNCTION calculate_level(xp_amount integer)
RETURNS integer AS $$
BEGIN
  RETURN FLOOR(xp_amount / 250) + 1;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_last_activity ON profiles(last_activity);
CREATE INDEX IF NOT EXISTS idx_profiles_streak ON profiles(streak);
CREATE INDEX IF NOT EXISTS idx_profiles_xp ON profiles(xp);

-- Create lessons table for shared AI-generated lessons
CREATE TABLE IF NOT EXISTS public.lessons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc', now())
);