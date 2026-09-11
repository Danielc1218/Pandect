-- profiles: extends auth.users with LSAT-specific data
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  target_score INT CHECK (target_score BETWEEN 120 AND 180),
  curr_score INT CHECK (curr_score BETWEEN 120 AND 180),
  test_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- auto-create a profile row on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- tests: one row per practice test
CREATE TABLE tests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  year INT,
  source TEXT
);

ALTER TABLE tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tests are readable by authenticated users"
  ON tests FOR SELECT
  TO authenticated
  USING (true);

-- passages: RC passages, referenced by their questions
CREATE TABLE passages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id TEXT NOT NULL REFERENCES tests ON DELETE CASCADE,
  passage_text TEXT NOT NULL,
  topic TEXT
);

ALTER TABLE passages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Passages are readable by authenticated users"
  ON passages FOR SELECT
  TO authenticated
  USING (true);

-- questions: the core table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id TEXT NOT NULL REFERENCES tests ON DELETE CASCADE,
  section_type TEXT NOT NULL CHECK (section_type IN ('Logical Reasoning', 'Reading Comprehension')),
  section_number INT NOT NULL,
  question_number INT NOT NULL,
  question_type TEXT NOT NULL,
  passage_id UUID REFERENCES passages ON DELETE SET NULL,
  stimulus TEXT,
  prompt TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E')),
  tags TEXT[] DEFAULT '{}',
  UNIQUE (test_id, section_number, question_number)
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Questions are readable by authenticated users"
  ON questions FOR SELECT
  TO authenticated
  USING (true);
