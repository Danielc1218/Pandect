-- Display and accessibility preferences (web/lib/prefs.ts), stored as only the values that differ from the
-- defaults. The web app validates them; the database just keeps them small and an object.
ALTER TABLE profiles
  ADD COLUMN preferences JSONB NOT NULL DEFAULT '{}'
  CHECK (jsonb_typeof(preferences) = 'object' AND pg_column_size(preferences) < 4096);
