-- Supabase Database Schema for Shopora Maps
-- This file contains the SQL schema needed for the application to work

-- Create landmarks table
CREATE TABLE IF NOT EXISTS landmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  voice_note TEXT, -- Base64 encoded audio data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on app_id for efficient filtering
CREATE INDEX IF NOT EXISTS idx_landmarks_app_id ON landmarks(app_id);

-- Create index on user_id for agent statistics
CREATE INDEX IF NOT EXISTS idx_landmarks_user_id ON landmarks(user_id);

-- Create index on coordinates for spatial queries
CREATE INDEX IF NOT EXISTS idx_landmarks_coordinates ON landmarks(latitude, longitude);

-- Enable Row Level Security (RLS)
ALTER TABLE landmarks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users (adjust based on your security needs)
CREATE POLICY "Allow all operations for app users" ON landmarks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable Realtime for landmarks table
-- Note: In Supabase dashboard, you may need to enable replication manually:
-- Go to Database > Replication and toggle the landmarks table ON
-- The command below may not work in all Supabase setups, so use the dashboard method
-- ALTER PUBLICATION supabase_realtime ADD TABLE landmarks;

