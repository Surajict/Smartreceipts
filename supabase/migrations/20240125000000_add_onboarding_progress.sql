-- Create onboarding_progress table
CREATE TABLE IF NOT EXISTS onboarding_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_items TEXT[] DEFAULT '{}',
  tour_completed BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  first_login BOOLEAN DEFAULT TRUE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own onboarding progress
CREATE POLICY "Users can manage their own onboarding progress" ON onboarding_progress
  FOR ALL USING (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_completed ON onboarding_progress(onboarding_completed);

-- Add comments for documentation
COMMENT ON TABLE onboarding_progress IS 'Tracks user onboarding progress and completion status';
COMMENT ON COLUMN onboarding_progress.user_id IS 'References the authenticated user';
COMMENT ON COLUMN onboarding_progress.completed_items IS 'Array of completed onboarding checklist item IDs';
COMMENT ON COLUMN onboarding_progress.tour_completed IS 'Whether the user has completed the interactive tour';
COMMENT ON COLUMN onboarding_progress.onboarding_completed IS 'Whether the user has completed all onboarding steps';
COMMENT ON COLUMN onboarding_progress.first_login IS 'Whether this is the users first login session';
COMMENT ON COLUMN onboarding_progress.last_updated IS 'When the progress was last updated';
COMMENT ON COLUMN onboarding_progress.created_at IS 'When the onboarding record was created'; 