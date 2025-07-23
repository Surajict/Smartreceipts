/*
  # Add Warranty Bot Logs Table
  
  1. New Tables
    - `warranty_bot_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `receipt_id` (uuid, foreign key to receipts)
      - `query_text` (text, user's question)
      - `bot_response` (text, AI's response)
      - `timestamp` (timestamptz, when query was made)
      
  2. Security
    - Enable RLS on `warranty_bot_logs` table
    - Add policies for users to access their own logs
    - Add policy for service role to access all logs (for analytics)
    
  3. Indexes
    - Add indexes for efficient querying by user_id and timestamp
*/

-- Create warranty_bot_logs table
CREATE TABLE IF NOT EXISTS warranty_bot_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  receipt_id uuid REFERENCES receipts(id) ON DELETE CASCADE,
  query_text text NOT NULL,
  bot_response text DEFAULT '',
  timestamp timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE warranty_bot_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own warranty bot logs"
  ON warranty_bot_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own warranty bot logs"
  ON warranty_bot_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own warranty bot logs"
  ON warranty_bot_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all warranty bot logs"
  ON warranty_bot_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS warranty_bot_logs_user_id_idx ON warranty_bot_logs(user_id);
CREATE INDEX IF NOT EXISTS warranty_bot_logs_timestamp_idx ON warranty_bot_logs(timestamp);
CREATE INDEX IF NOT EXISTS warranty_bot_logs_receipt_id_idx ON warranty_bot_logs(receipt_id);

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS warranty_bot_logs_user_timestamp_idx ON warranty_bot_logs(user_id, timestamp DESC);