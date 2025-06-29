/*
  # Create user privacy settings table

  1. New Tables
    - `user_privacy_settings`
      - `user_id` (uuid, primary key, references auth.users)
      - `data_collection` (boolean, default true)
      - `data_analysis` (text, default 'allowed', check constraint)
      - `biometric_login` (boolean, default false)
      - `two_factor_auth` (boolean, default false)
      - `created_at` (timestamp with time zone, default now())
      - `updated_at` (timestamp with time zone, default now())

  2. Security
    - Enable RLS on `user_privacy_settings` table
    - Add policies for authenticated users to manage their own settings

  3. Triggers
    - Add trigger to automatically update `updated_at` timestamp
*/

-- Create the user_privacy_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_privacy_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data_collection boolean NOT NULL DEFAULT true,
  data_analysis text NOT NULL DEFAULT 'allowed',
  biometric_login boolean NOT NULL DEFAULT false,
  two_factor_auth boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add check constraint for data_analysis
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_privacy_settings_data_analysis_check'
    AND table_name = 'user_privacy_settings'
  ) THEN
    ALTER TABLE public.user_privacy_settings 
    ADD CONSTRAINT user_privacy_settings_data_analysis_check 
    CHECK (data_analysis = ANY (ARRAY['allowed'::text, 'not_allowed'::text]));
  END IF;
END $$;

-- Create index on user_id if it doesn't exist
CREATE INDEX IF NOT EXISTS user_privacy_settings_user_id_idx ON public.user_privacy_settings(user_id);

-- Enable Row Level Security
ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$
BEGIN
  -- Policy for SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_privacy_settings' 
    AND policyname = 'Users can view own privacy settings'
  ) THEN
    CREATE POLICY "Users can view own privacy settings"
      ON public.user_privacy_settings
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- Policy for INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_privacy_settings' 
    AND policyname = 'Users can insert own privacy settings'
  ) THEN
    CREATE POLICY "Users can insert own privacy settings"
      ON public.user_privacy_settings
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Policy for UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_privacy_settings' 
    AND policyname = 'Users can update own privacy settings'
  ) THEN
    CREATE POLICY "Users can update own privacy settings"
      ON public.user_privacy_settings
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create or replace the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating updated_at column
DROP TRIGGER IF EXISTS update_user_privacy_settings_updated_at ON public.user_privacy_settings;
CREATE TRIGGER update_user_privacy_settings_updated_at
  BEFORE UPDATE ON public.user_privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();