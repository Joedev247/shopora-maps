CREATE TABLE IF NOT EXISTS landmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  voice_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landmarks_app_id ON landmarks(app_id);
CREATE INDEX IF NOT EXISTS idx_landmarks_user_id ON landmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_landmarks_coordinates ON landmarks(latitude, longitude);

ALTER TABLE landmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for app users" ON landmarks
  FOR ALL
  USING (true)
  WITH CHECK (true);
