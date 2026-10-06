-- A random Reading Comprehension section is built like a real one: whole passages, each with all its questions
-- in order, one comparative pair (Passage A / Passage B) and the rest from different areas (passages.topic),
-- four passages in all. Passages the caller has not seen come first. p_size applies to Logical Reasoning only.
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
      WHERE t.bank = p_bank AND EXISTS (SELECT 1 FROM questions q WHERE q.passage_id = ps.id)
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
    FROM picked pk JOIN questions q ON q.passage_id = pk.id;
  ELSE
    INSERT INTO session_questions (session_id, question_id, position)
    SELECT sid, pick.id, row_number() OVER (ORDER BY random())
    FROM (SELECT q.id FROM questions q JOIN tests t ON t.id = q.test_id
          WHERE t.bank = p_bank AND q.section_type = p_section_type AND q.passage_id IS NULL
          ORDER BY EXISTS (SELECT 1 FROM attempts a WHERE a.question_id = q.id AND a.user_id = uid), random()
          LIMIT p_size) pick;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'No % questions in the % bank', p_section_type, p_bank; END IF;
  RETURN sid;
END;
$$;
