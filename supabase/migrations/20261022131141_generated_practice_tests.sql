-- Generated practice tests shaped like real ones. Test k ("Generated Practice Test k", id GEN-PT-0k) has:
--   section 1, Logical Reasoning: LR ranks (k-1)*50+1 ... (k-1)*50+25;
--   section 2, Reading Comprehension: passage ranks (k-1)*4+1 ... (k-1)*4+4, numbered by passage rank, then number;
--   section 3, Logical Reasoning: LR ranks (k-1)*50+26 ... (k-1)*50+50.
-- LR questions rank by their permanent generator number, now kept in source_number; passages by their smallest one.
-- New questions get higher numbers, so they append and nothing already laid out moves. scripts/import_generated.py
-- computes the same layout and upserts on source_number, so ids (and the history pointing at them) stay put.
-- GEN-LR and GEN-RC stay, empty: old sessions show their names. The other bank is untouched (source_number NULL).
ALTER TABLE questions ADD COLUMN source_number INT UNIQUE;

CREATE FUNCTION layout_generated_tests() RETURNS void
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- The layout before this one was (GEN-LR or GEN-RC, section 1, permanent number).
  UPDATE questions q SET source_number = q.question_number
  FROM tests t WHERE t.id = q.test_id AND t.bank = 'generated' AND q.source_number IS NULL;

  DROP TABLE IF EXISTS pg_temp.generated_layout;
  CREATE TEMP TABLE generated_layout ON COMMIT DROP AS
  WITH gen AS (
    SELECT q.id, q.section_type, q.passage_id, q.source_number
    FROM questions q JOIN tests t ON t.id = q.test_id WHERE t.bank = 'generated'
  ), lr AS (
    SELECT id, row_number() OVER (ORDER BY source_number) - 1 AS r FROM gen WHERE section_type = 'Logical Reasoning'
  ), ranked AS (
    SELECT passage_id, row_number() OVER (ORDER BY min(source_number)) - 1 AS r
    FROM gen WHERE section_type = 'Reading Comprehension' AND passage_id IS NOT NULL GROUP BY passage_id
  ), placed AS (
    SELECT id, r / 50 + 1 AS k, CASE WHEN r % 50 < 25 THEN 1 ELSE 3 END AS section_number, r % 25 + 1 AS question_number,
           NULL::uuid AS passage_id
    FROM lr
    UNION ALL
    SELECT g.id, p.r / 4 + 1, 2, row_number() OVER (PARTITION BY p.r / 4 ORDER BY p.r, g.source_number), g.passage_id
    FROM gen g JOIN ranked p ON p.passage_id = g.passage_id WHERE g.section_type = 'Reading Comprehension'
  )
  SELECT *, 'GEN-PT-' || CASE WHEN k < 10 THEN '0' ELSE '' END || k AS test_id FROM placed;

  INSERT INTO tests (id, name, source)
  SELECT DISTINCT test_id, 'Generated Practice Test ' || k, 'generated' FROM generated_layout
  ON CONFLICT (id) DO NOTHING;
  -- UNIQUE (test_id, section_number, question_number) is checked row by row, so first move every row out of the way.
  UPDATE questions q SET question_number = -q.question_number FROM generated_layout l WHERE q.id = l.id;
  UPDATE questions q SET test_id = l.test_id, section_number = l.section_number, question_number = l.question_number
  FROM generated_layout l WHERE q.id = l.id;
  UPDATE passages p SET test_id = l.test_id
  FROM (SELECT DISTINCT passage_id, test_id FROM generated_layout WHERE passage_id IS NOT NULL) l WHERE p.id = l.passage_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION layout_generated_tests() FROM PUBLIC, anon, authenticated;

SELECT layout_generated_tests();

-- The practice list shows a generated test once it is whole, which takes counting passages per section.
CREATE OR REPLACE VIEW bank_test_sections WITH (security_invoker = true) AS
  SELECT t.bank, q.test_id, q.section_number, q.section_type, count(*)::int AS questions,
         count(DISTINCT q.passage_id)::int AS passages
  FROM questions q JOIN tests t ON t.id = q.test_id
  WHERE q.published
  GROUP BY t.bank, q.test_id, q.section_number, q.section_type;
