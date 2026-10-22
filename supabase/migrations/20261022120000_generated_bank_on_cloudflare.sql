-- The generated bank's wording, answers, explanations and passage text now live only in the encrypted files on
-- Cloudflare Pages (cloudflare/scripts/export-bank.ts reads them from a local dump). Supabase keeps the generated
-- index: ids, keys, types, passage links, published flags and tests. The other bank is unchanged.
ALTER TABLE questions ALTER COLUMN prompt DROP NOT NULL, ALTER COLUMN options DROP NOT NULL, ALTER COLUMN correct_answer DROP NOT NULL;
ALTER TABLE passages ALTER COLUMN passage_text DROP NOT NULL;

-- start_random_section pairs RC passages by how their text opens ("Passage A"), so that answer gets its own
-- column, filled in before the generated text goes. A row written with text (the other-bank importer) takes it
-- from the text; a row written without (the generated importer) keeps the value it sends.
ALTER TABLE passages ADD COLUMN paired BOOLEAN NOT NULL DEFAULT false;
UPDATE passages SET paired = passage_text LIKE 'Passage A%';

CREATE FUNCTION set_passage_paired() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.passage_text IS NOT NULL THEN
    NEW.paired := NEW.passage_text LIKE 'Passage A%';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION set_passage_paired() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER passages_paired BEFORE INSERT OR UPDATE ON passages FOR EACH ROW EXECUTE FUNCTION set_passage_paired();

UPDATE questions q SET stimulus = NULL, prompt = NULL, options = NULL, correct_answer = NULL, explanation = NULL
FROM tests t WHERE t.id = q.test_id AND t.bank = 'generated';
UPDATE passages p SET passage_text = NULL
FROM tests t WHERE t.id = p.test_id AND t.bank = 'generated';

-- Unchanged but for reading paired instead of the passage text.
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
