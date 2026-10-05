-- Learner progress: weekly goal, timed test sessions, and graded answer attempts.

ALTER TABLE profiles
  ADD COLUMN weekly_goal INT NOT NULL DEFAULT 60 CHECK (weekly_goal BETWEEN 1 AND 500);

CREATE TABLE test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  test_id TEXT NOT NULL REFERENCES tests ON DELETE CASCADE,
  section_number INT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX test_sessions_user_idx ON test_sessions (user_id, started_at DESC);

CREATE TABLE attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions ON DELETE CASCADE,
  session_id UUID REFERENCES test_sessions ON DELETE CASCADE,
  chosen TEXT NOT NULL CHECK (chosen IN ('A', 'B', 'C', 'D', 'E')),
  correct BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_id)
);
CREATE INDEX attempts_user_idx ON attempts (user_id, created_at DESC);
CREATE INDEX attempts_question_idx ON attempts (question_id);

-- The database grades the answer, so a client cannot record a wrong answer as right.
CREATE FUNCTION grade_attempt() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.user_id := auth.uid();
  NEW.correct := (SELECT q.correct_answer = NEW.chosen FROM questions q WHERE q.id = NEW.question_id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER attempts_grade BEFORE INSERT OR UPDATE ON attempts
  FOR EACH ROW EXECUTE FUNCTION grade_attempt();

ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sessions" ON test_sessions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own attempts" ON attempts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON test_sessions, attempts TO authenticated;
GRANT ALL ON test_sessions, attempts TO service_role;

-- How many questions each type has. security_invoker keeps the caller's row-level rules.
CREATE VIEW question_type_counts WITH (security_invoker = true) AS
  SELECT section_type, question_type, count(*)::int AS total
  FROM questions GROUP BY section_type, question_type;

-- The caller's own record per type, counting only the latest attempt at each question.
CREATE VIEW my_type_stats WITH (security_invoker = true) AS
  SELECT q.section_type, q.question_type,
         count(*)::int AS answered,
         (count(*) FILTER (WHERE a.correct))::int AS correct
  FROM (SELECT DISTINCT ON (question_id) question_id, correct
        FROM attempts ORDER BY question_id, created_at DESC) a
  JOIN questions q ON q.id = a.question_id
  GROUP BY q.section_type, q.question_type;

GRANT SELECT ON question_type_counts, my_type_stats TO authenticated;

-- The next question of a type that the caller has not answered yet.
CREATE FUNCTION next_question(p_section TEXT, p_type TEXT) RETURNS UUID
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT q.id FROM questions q
  WHERE q.section_type = p_section AND q.question_type = p_type
    AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.question_id = q.id AND a.user_id = auth.uid())
  ORDER BY q.test_id, q.section_number, q.question_number
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION next_question(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION next_question(TEXT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION grade_attempt() FROM PUBLIC, anon, authenticated;

-- The sections each test has, for the practice test list.
CREATE VIEW test_sections WITH (security_invoker = true) AS
  SELECT test_id, section_number, section_type, count(*)::int AS questions
  FROM questions GROUP BY test_id, section_number, section_type;
GRANT SELECT ON test_sections TO authenticated;
