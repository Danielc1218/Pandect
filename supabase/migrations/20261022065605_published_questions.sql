-- A question reaches users only once its files are on the CDN. The generated importer adds rows unpublished
-- (the new default); export-bank.ts --deploy marks them published after the deployed files verify.
-- Rows that exist now take the first default, true, so nothing already served disappears.
ALTER TABLE questions ADD COLUMN published BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE questions ALTER COLUMN published SET DEFAULT false;
GRANT SELECT (published) ON questions TO authenticated;

-- my_bank_type_stats is unchanged: it counts the caller's own attempts, which can only be at published questions.

CREATE OR REPLACE VIEW bank_type_counts WITH (security_invoker = true) AS
  SELECT t.bank, q.section_type, q.question_type, count(*)::int AS total
  FROM questions q JOIN tests t ON t.id = q.test_id
  WHERE q.published
  GROUP BY t.bank, q.section_type, q.question_type;

CREATE OR REPLACE VIEW bank_test_sections WITH (security_invoker = true) AS
  SELECT t.bank, q.test_id, q.section_number, q.section_type, count(*)::int AS questions
  FROM questions q JOIN tests t ON t.id = q.test_id
  WHERE q.published
  GROUP BY t.bank, q.test_id, q.section_number, q.section_type;

CREATE OR REPLACE FUNCTION next_question(p_section TEXT, p_type TEXT) RETURNS UUID
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT q.id FROM questions q
  WHERE q.published AND q.section_type = p_section AND q.question_type = p_type
    AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.question_id = q.id AND a.user_id = auth.uid())
  ORDER BY q.test_id, q.section_number, q.question_number
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION next_question(p_section TEXT, p_type TEXT, p_bank TEXT) RETURNS UUID
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT q.id FROM questions q JOIN tests t ON t.id = q.test_id
  WHERE q.published AND t.bank = p_bank AND q.section_type = p_section AND q.question_type = p_type
    AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.question_id = q.id AND a.user_id = auth.uid())
  ORDER BY q.test_id, q.section_number, q.question_number
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION fill_fixed_session() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.kind = 'fixed' THEN
    INSERT INTO session_questions (session_id, question_id, position)
    SELECT NEW.id, q.id, row_number() OVER (ORDER BY q.question_number)
    FROM questions q WHERE q.published AND q.test_id = NEW.test_id AND q.section_number = NEW.section_number;
    UPDATE test_sessions s SET bank = t.bank,
      section_type = (SELECT q.section_type FROM questions q
                      WHERE q.published AND q.test_id = NEW.test_id AND q.section_number = NEW.section_number LIMIT 1)
    FROM tests t WHERE s.id = NEW.id AND t.id = NEW.test_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION start_random_section(p_bank TEXT, p_section_type TEXT, p_size INT DEFAULT 25) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  sid UUID;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF p_size NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'A section has 1 to 50 questions'; END IF;
  INSERT INTO test_sessions (user_id, kind, bank, section_type)
  VALUES (uid, 'random', p_bank, p_section_type) RETURNING id INTO sid;
  IF p_section_type = 'Reading Comprehension' THEN
    WITH p AS (
      SELECT ps.id, ps.topic, ps.passage_text LIKE 'Passage A%' AS paired, random() AS r,
             EXISTS (SELECT 1 FROM questions q JOIN attempts a ON a.question_id = q.id
                     WHERE q.passage_id = ps.id AND a.user_id = uid) AS seen
      FROM passages ps JOIN tests t ON t.id = ps.test_id
      WHERE t.bank = p_bank AND EXISTS (SELECT 1 FROM questions q WHERE q.passage_id = ps.id AND q.published)
    ), pair AS (
      SELECT * FROM p WHERE paired ORDER BY seen, r LIMIT 1
    ), one_per_area AS (
      SELECT DISTINCT ON (topic) * FROM p
      WHERE NOT paired AND topic IS DISTINCT FROM (SELECT topic FROM pair)
      ORDER BY topic, seen, r
    ), picked AS (
      SELECT * FROM pair
      UNION ALL
      (SELECT * FROM one_per_area ORDER BY seen, r LIMIT 4 - (SELECT count(*) FROM pair))
    )
    INSERT INTO session_questions (session_id, question_id, position)
    SELECT sid, q.id, row_number() OVER (ORDER BY pk.r, q.question_number)
    FROM picked pk JOIN questions q ON q.passage_id = pk.id AND q.published;
  ELSE
    INSERT INTO session_questions (session_id, question_id, position)
    SELECT sid, pick.id, row_number() OVER (ORDER BY random())
    FROM (SELECT q.id FROM questions q JOIN tests t ON t.id = q.test_id
          WHERE q.published AND t.bank = p_bank AND q.section_type = p_section_type AND q.passage_id IS NULL
          ORDER BY EXISTS (SELECT 1 FROM attempts a WHERE a.question_id = q.id AND a.user_id = uid), random()
          LIMIT p_size) pick;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'No % questions in the % bank', p_section_type, p_bank; END IF;
  RETURN sid;
END;
$$;
