/*
  # Add Chatbot Tables for FAQ System
  
  1. New Tables
    - `chat_sessions` - Track chat sessions
    - `user_queries` - Log all user queries and responses
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_queries table
CREATE TABLE IF NOT EXISTS user_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  query_text text NOT NULL,
  response_text text NOT NULL,
  faq_matched text,
  response_type text CHECK (response_type IN ('faq', 'ai', 'fallback')) DEFAULT 'faq',
  timestamp timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_queries ENABLE ROW LEVEL SECURITY;

-- Policies for chat_sessions
CREATE POLICY "Users can view own chat sessions"
  ON chat_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat sessions"
  ON chat_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions"
  ON chat_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all chat sessions"
  ON chat_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policies for user_queries
CREATE POLICY "Users can view own queries"
  ON user_queries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own queries"
  ON user_queries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all queries"
  ON user_queries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to create sessions and queries (for non-logged-in users)
CREATE POLICY "Anonymous users can create chat sessions"
  ON chat_sessions
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Anonymous users can create queries"
  ON user_queries
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_queries_session_id ON user_queries(session_id);
CREATE INDEX IF NOT EXISTS idx_user_queries_user_id ON user_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_queries_timestamp ON user_queries(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_queries_response_type ON user_queries(response_type);
CREATE INDEX IF NOT EXISTS idx_user_queries_faq_matched ON user_queries(faq_matched);

-- Add updated_at trigger for chat_sessions
CREATE OR REPLACE FUNCTION update_chat_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_sessions_updated_at();