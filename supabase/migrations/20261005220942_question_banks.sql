-- Two question banks: "other" and "generated"
-- (questions written by scripts/generate_questions.py). A test belongs to one bank, decided by its source.
-- The web app chooses which bank to serve; these objects let it read one bank at a time.

ALTER TABLE tests
  ADD COLUMN bank TEXT GENERATED ALWAYS AS (CASE WHEN source = 'generated' THEN 'generated' ELSE 'other' END) STORED;

CREATE VIEW bank_type_counts WITH (security_invoker = true) AS
  SELECT t.bank, q.section_type, q.question_type, count(*)::int AS total
  FROM questions q JOIN tests t ON t.id = q.test_id
  GROUP BY t.bank, q.section_type, q.question_type;

CREATE VIEW bank_test_sections WITH (security_invoker = true) AS
  SELECT t.bank, q.test_id, q.section_number, q.section_type, count(*)::int AS questions
  FROM questions q JOIN tests t ON t.id = q.test_id
  GROUP BY t.bank, q.test_id, q.section_number, q.section_type;

-- The caller's own record per type within one bank, counting only the latest attempt at each question.
CREATE VIEW my_bank_type_stats WITH (security_invoker = true) AS
  SELECT t.bank, q.section_type, q.question_type,
         count(*)::int AS answered,
         (count(*) FILTER (WHERE a.correct))::int AS correct
  FROM (SELECT DISTINCT ON (question_id) question_id, correct
        FROM attempts ORDER BY question_id, created_at DESC) a
  JOIN questions q ON q.id = a.question_id
  JOIN tests t ON t.id = q.test_id
  GROUP BY t.bank, q.section_type, q.question_type;

GRANT SELECT ON bank_type_counts, bank_test_sections, my_bank_type_stats TO authenticated;
GRANT SELECT ON bank_type_counts, bank_test_sections, my_bank_type_stats TO service_role;

-- The next question of a type, in one bank, that the caller has not answered yet.
CREATE FUNCTION next_question(p_section TEXT, p_type TEXT, p_bank TEXT) RETURNS UUID
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT q.id FROM questions q JOIN tests t ON t.id = q.test_id
  WHERE t.bank = p_bank AND q.section_type = p_section AND q.question_type = p_type
    AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.question_id = q.id AND a.user_id = auth.uid())
  ORDER BY q.test_id, q.section_number, q.question_number
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION next_question(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION next_question(TEXT, TEXT, TEXT) TO authenticated;
