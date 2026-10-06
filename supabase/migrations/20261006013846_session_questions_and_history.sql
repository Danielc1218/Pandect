-- A timed section records exactly which questions it holds, so it can be a fixed practice test section or a
-- random set drawn from a bank, and a finished section keeps its score. Together with attempts this is each
-- user's history of completed tests, and it stays correct even if the question bank changes later.

ALTER TABLE test_sessions
  ALTER COLUMN test_id DROP NOT NULL,          -- a random set has no single test
  ALTER COLUMN section_number DROP NOT NULL,
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'fixed' CHECK (kind IN ('fixed', 'random')),
  ADD COLUMN bank TEXT,
  ADD COLUMN section_type TEXT,
  ADD COLUMN score_correct INT,                -- set by the database when the section is finished
  ADD COLUMN score_total INT,
  ADD CONSTRAINT fixed_sessions_name_a_section CHECK (kind = 'random' OR (test_id IS NOT NULL AND section_number IS NOT NULL));

CREATE TABLE session_questions (
  session_id UUID NOT NULL REFERENCES test_sessions ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions ON DELETE CASCADE,
  position INT NOT NULL,
  PRIMARY KEY (session_id, position),
  UNIQUE (session_id, question_id)
);
ALTER TABLE session_questions ENABLE ROW LEVEL SECURITY;
-- Read-only to users: rows are written by the functions below, never by the client.
CREATE POLICY "Users read own session questions" ON session_questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM test_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
GRANT SELECT ON session_questions TO authenticated;
GRANT ALL ON session_questions TO service_role;

-- A fixed section's questions, in order, for a session that names a test and section.
CREATE FUNCTION fill_fixed_session() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.kind = 'fixed' THEN
    INSERT INTO session_questions (session_id, question_id, position)
    SELECT NEW.id, q.id, row_number() OVER (ORDER BY q.question_number)
    FROM questions q WHERE q.test_id = NEW.test_id AND q.section_number = NEW.section_number;
    UPDATE test_sessions s SET bank = t.bank,
      section_type = (SELECT q.section_type FROM questions q WHERE q.test_id = NEW.test_id AND q.section_number = NEW.section_number LIMIT 1)
    FROM tests t WHERE s.id = NEW.id AND t.id = NEW.test_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER test_sessions_fill AFTER INSERT ON test_sessions FOR EACH ROW EXECUTE FUNCTION fill_fixed_session();

-- Sessions that existed before this migration: record their questions and score the finished ones.
-- (Before the scoring trigger below, which treats finished sessions as read-only.)
INSERT INTO session_questions (session_id, question_id, position)
SELECT s.id, q.id, row_number() OVER (PARTITION BY s.id ORDER BY q.question_number)
FROM test_sessions s JOIN questions q ON q.test_id = s.test_id AND q.section_number = s.section_number;
UPDATE test_sessions s SET bank = t.bank,
  section_type = (SELECT q.section_type FROM questions q WHERE q.test_id = s.test_id AND q.section_number = s.section_number LIMIT 1)
FROM tests t WHERE t.id = s.test_id;
UPDATE test_sessions s SET
  score_total = (SELECT count(*) FROM session_questions sq WHERE sq.session_id = s.id),
  score_correct = (SELECT count(*) FROM attempts a JOIN session_questions sq ON sq.session_id = a.session_id AND sq.question_id = a.question_id
                   WHERE a.session_id = s.id AND a.correct)
WHERE s.finished_at IS NOT NULL;

-- The score is the database's to set, and a finished section is history: it can't be reopened or rescored.
CREATE FUNCTION score_session() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.finished_at IS NOT NULL THEN
    NEW.finished_at := OLD.finished_at;
    NEW.score_correct := OLD.score_correct;
    NEW.score_total := OLD.score_total;
  ELSIF NEW.finished_at IS NOT NULL THEN
    NEW.score_total := (SELECT count(*) FROM session_questions WHERE session_id = NEW.id);
    NEW.score_correct := (SELECT count(*) FROM attempts a
                          JOIN session_questions sq ON sq.session_id = a.session_id AND sq.question_id = a.question_id
                          WHERE a.session_id = NEW.id AND a.correct);
  ELSE
    NEW.score_correct := NULL;
    NEW.score_total := NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER test_sessions_score BEFORE UPDATE ON test_sessions FOR EACH ROW EXECUTE FUNCTION score_session();

-- A timed section of p_size random questions from one bank, preferring questions the caller hasn't answered.
-- Questions without a passage only (Logical Reasoning); a random Reading Comprehension set must
-- draw whole passages, add that when the generated bank has passages.
CREATE FUNCTION start_random_section(p_bank TEXT, p_section_type TEXT, p_size INT DEFAULT 25) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  sid UUID;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF p_size NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'A section has 1 to 50 questions'; END IF;
  INSERT INTO test_sessions (user_id, kind, bank, section_type)
  VALUES (uid, 'random', p_bank, p_section_type) RETURNING id INTO sid;
  INSERT INTO session_questions (session_id, question_id, position)
  SELECT sid, pick.id, row_number() OVER (ORDER BY random())
  FROM (SELECT q.id FROM questions q JOIN tests t ON t.id = q.test_id
        WHERE t.bank = p_bank AND q.section_type = p_section_type AND q.passage_id IS NULL
        ORDER BY EXISTS (SELECT 1 FROM attempts a WHERE a.question_id = q.id AND a.user_id = uid), random()
        LIMIT p_size) pick;
  IF NOT FOUND THEN RAISE EXCEPTION 'No % questions in the % bank', p_section_type, p_bank; END IF;
  RETURN sid;
END;
$$;
REVOKE EXECUTE ON FUNCTION start_random_section(TEXT, TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION start_random_section(TEXT, TEXT, INT) TO authenticated;
REVOKE EXECUTE ON FUNCTION fill_fixed_session() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION score_session() FROM PUBLIC, anon, authenticated;
