-- questions.published is now questions.ready. It never meant "public": it means the question's files are deployed
-- (for the generated bank, on the CDN), so the site may use it. The default (false), NOT NULL and the users' column
-- grant follow the rename, and bank_type_counts and bank_test_sections follow it by themselves (a view stores the
-- column, not its name). Functions store their text, so each one that says published is recreated below, unchanged
-- but for the name, from its latest definition.
ALTER TABLE questions RENAME COLUMN published TO ready;
COMMENT ON COLUMN questions.ready IS
  'The question''s files are deployed, so the site may use it. Deployed, not public: its wording and answers stay server-side.';

-- From 20261022065605_published_questions.sql.
CREATE OR REPLACE FUNCTION next_question(p_section TEXT, p_type TEXT) RETURNS UUID
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT q.id FROM questions q
  WHERE q.ready AND q.section_type = p_section AND q.question_type = p_type
    AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.question_id = q.id AND a.user_id = auth.uid())
  ORDER BY q.test_id, q.section_number, q.question_number
  LIMIT 1;
$$;

-- From 20261022065605_published_questions.sql.
CREATE OR REPLACE FUNCTION next_question(p_section TEXT, p_type TEXT, p_bank TEXT) RETURNS UUID
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT q.id FROM questions q JOIN tests t ON t.id = q.test_id
  WHERE q.ready AND t.bank = p_bank AND q.section_type = p_section AND q.question_type = p_type
    AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.question_id = q.id AND a.user_id = auth.uid())
  ORDER BY q.test_id, q.section_number, q.question_number
  LIMIT 1;
$$;

-- From 20261022065605_published_questions.sql.
CREATE OR REPLACE FUNCTION fill_fixed_session() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.kind = 'fixed' THEN
    INSERT INTO session_questions (session_id, question_id, position)
    SELECT NEW.id, q.id, row_number() OVER (ORDER BY q.question_number)
    FROM questions q WHERE q.ready AND q.test_id = NEW.test_id AND q.section_number = NEW.section_number;
    UPDATE test_sessions s SET bank = t.bank,
      section_type = (SELECT q.section_type FROM questions q
                      WHERE q.ready AND q.test_id = NEW.test_id AND q.section_number = NEW.section_number LIMIT 1)
    FROM tests t WHERE s.id = NEW.id AND t.id = NEW.test_id;
  END IF;
  RETURN NULL;
END;
$$;

-- From 20261022122855_generated_bank_on_cloudflare.sql.
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
      SELECT ps.id, ps.topic, ps.paired, random() AS r,
             EXISTS (SELECT 1 FROM questions q JOIN attempts a ON a.question_id = q.id
                     WHERE q.passage_id = ps.id AND a.user_id = uid) AS seen
      FROM passages ps JOIN tests t ON t.id = ps.test_id
      WHERE t.bank = p_bank AND EXISTS (SELECT 1 FROM questions q WHERE q.passage_id = ps.id AND q.ready)
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
    FROM picked pk JOIN questions q ON q.passage_id = pk.id AND q.ready;
  ELSE
    INSERT INTO session_questions (session_id, question_id, position)
    SELECT sid, pick.id, row_number() OVER (ORDER BY random())
    FROM (SELECT q.id FROM questions q JOIN tests t ON t.id = q.test_id
          WHERE q.ready AND t.bank = p_bank AND q.section_type = p_section_type AND q.passage_id IS NULL
          ORDER BY EXISTS (SELECT 1 FROM attempts a WHERE a.question_id = q.id AND a.user_id = uid), random()
          LIMIT p_size) pick;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'No % questions in the % bank', p_section_type, p_bank; END IF;
  RETURN sid;
END;
$$;
