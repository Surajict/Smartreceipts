/*
  # Create receipts table and storage

  1. New Tables
    - `receipts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `purchase_date` (date)
      - `country` (text)
      - `product_description` (text)
      - `brand_name` (text)
      - `model_number` (text, optional)
      - `warranty_period` (text)
      - `extended_warranty` (text, optional)
      - `amount` (decimal, optional)
      - `image_path` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Storage
    - Create `receipts` bucket for storing receipt images
    - Enable RLS on storage bucket

  3. Security
    - Enable RLS on `receipts` table
    - Add policies for authenticated users to manage their own receipts
    - Add storage policies for receipt images
*/

-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  purchase_date date NOT NULL,
  country text NOT NULL,
  product_description text NOT NULL,
  brand_name text NOT NULL,
  model_number text,
  warranty_period text NOT NULL,
  extended_warranty text,
  amount decimal(10,2),
  image_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Create policies for receipts table
CREATE POLICY "Users can view own receipts"
  ON receipts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receipts"
  ON receipts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receipts"
  ON receipts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own receipts"
  ON receipts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload own receipt images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own receipt images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own receipt images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own receipt images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS receipts_user_id_idx ON receipts(user_id);
CREATE INDEX IF NOT EXISTS receipts_purchase_date_idx ON receipts(purchase_date);
CREATE INDEX IF NOT EXISTS receipts_created_at_idx ON receipts(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_receipts_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();