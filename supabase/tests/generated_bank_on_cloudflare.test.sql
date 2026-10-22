-- The generated bank's wording and answers live only on Cloudflare; Supabase keeps its index. The other bank is untouched.
BEGIN;
SELECT plan(17);

SELECT col_is_null('public', 'questions', 'prompt', 'prompt may be NULL');
SELECT col_is_null('public', 'questions', 'options', 'options may be NULL');
SELECT col_is_null('public', 'questions', 'correct_answer', 'correct_answer may be NULL');
SELECT col_is_null('public', 'passages', 'passage_text', 'passage_text may be NULL');
SELECT col_not_null('public', 'passages', 'paired', 'every passage says whether it is paired');

-- Rows that existed before the migration: generated ones lost their content, other-bank ones kept theirs.
SELECT is((SELECT count(*) FROM questions q JOIN tests t ON t.id = q.test_id WHERE t.bank = 'generated'
  AND (q.stimulus IS NOT NULL OR q.prompt IS NOT NULL OR q.options IS NOT NULL OR q.correct_answer IS NOT NULL OR q.explanation IS NOT NULL))::int,
  0, 'no generated question keeps its wording, answer or explanation');
SELECT is((SELECT count(*) FROM passages p JOIN tests t ON t.id = p.test_id WHERE t.bank = 'generated' AND p.passage_text IS NOT NULL)::int,
  0, 'no generated passage keeps its text');
SELECT is((SELECT count(*) FROM questions q JOIN tests t ON t.id = q.test_id WHERE t.bank = 'other'
  AND (q.prompt IS NULL OR q.options IS NULL OR q.correct_answer IS NULL))::int, 0, 'every other-bank question keeps its wording and answer');
SELECT is((SELECT count(*) FROM passages p JOIN tests t ON t.id = p.test_id WHERE t.bank = 'other'
  AND (p.passage_text IS NULL OR p.paired IS DISTINCT FROM (p.passage_text LIKE 'Passage A%')))::int, 0, 'every other-bank passage keeps its text and pairing');

INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-0000000000a1', 'gbc@example.com');
INSERT INTO tests (id, name, source) VALUES ('gbc-gen', 'Generated', 'generated'), ('gbc-ot', 'Other', 'other');
-- The generated importer sends paired and no text; one paired passage and three single ones in other areas.
INSERT INTO passages (id, test_id, topic, paired) VALUES
  ('00000000-0000-0000-0000-0000000000d1', 'gbc-gen', 'Law', true),
  ('00000000-0000-0000-0000-0000000000d2', 'gbc-gen', 'Science', false),
  ('00000000-0000-0000-0000-0000000000d3', 'gbc-gen', 'Humanities', false),
  ('00000000-0000-0000-0000-0000000000d4', 'gbc-gen', 'Social Sciences', false);
-- An other-bank import sends text and no paired; the text decides.
INSERT INTO passages (id, test_id, passage_text, topic) VALUES
  ('00000000-0000-0000-0000-0000000000d5', 'gbc-ot', 'Passage A. One view.', 'Law'),
  ('00000000-0000-0000-0000-0000000000d6', 'gbc-ot', 'A single passage.', 'Law');
SELECT results_eq($$SELECT id, paired FROM passages WHERE test_id IN ('gbc-gen', 'gbc-ot') ORDER BY id$$,
  $$VALUES ('00000000-0000-0000-0000-0000000000d1'::uuid, true), ('00000000-0000-0000-0000-0000000000d2'::uuid, false),
           ('00000000-0000-0000-0000-0000000000d3'::uuid, false), ('00000000-0000-0000-0000-0000000000d4'::uuid, false),
           ('00000000-0000-0000-0000-0000000000d5'::uuid, true), ('00000000-0000-0000-0000-0000000000d6'::uuid, false)$$,
  'paired is kept as sent without text, and follows the text when there is some');
-- A later slim upsert (no text) keeps the pairing it sends.
UPDATE passages SET topic = 'Law' WHERE id = '00000000-0000-0000-0000-0000000000d1';
SELECT is((SELECT paired FROM passages WHERE id = '00000000-0000-0000-0000-0000000000d1'), true, 'an update without text keeps paired');

-- New generated questions arrive slim: no wording, no answer.
SELECT lives_ok($$INSERT INTO questions (id, test_id, section_type, section_number, question_number, question_type, passage_id, published) VALUES
  ('00000000-0000-0000-0000-0000000000b1', 'gbc-gen', 'Reading Comprehension', 1, 1, 'Main Point', '00000000-0000-0000-0000-0000000000d1', true),
  ('00000000-0000-0000-0000-0000000000b2', 'gbc-gen', 'Reading Comprehension', 1, 2, 'Main Point', '00000000-0000-0000-0000-0000000000d2', true),
  ('00000000-0000-0000-0000-0000000000b3', 'gbc-gen', 'Reading Comprehension', 1, 3, 'Main Point', '00000000-0000-0000-0000-0000000000d3', true),
  ('00000000-0000-0000-0000-0000000000b4', 'gbc-gen', 'Reading Comprehension', 1, 4, 'Main Point', '00000000-0000-0000-0000-0000000000d4', true),
  ('00000000-0000-0000-0000-0000000000b5', 'gbc-gen', 'Logical Reasoning', 1, 5, 'Flaw', NULL, true)$$,
  'a generated question can be inserted without wording or answer');
INSERT INTO questions (id, test_id, section_type, section_number, question_number, question_type, prompt, options, correct_answer, published) VALUES
  ('00000000-0000-0000-0000-0000000000b6', 'gbc-ot', 'Logical Reasoning', 1, 1, 'Flaw', 'Which?', '{"A":"a","B":"b"}', 'B', true);
SELECT throws_ok($$INSERT INTO questions (test_id, section_type, section_number, question_number, question_type, correct_answer)
  VALUES ('gbc-gen', 'Logical Reasoning', 1, 6, 'Flaw', 'F')$$, '23514', NULL, 'correct_answer is still A to E when given');

-- The database cannot grade a generated question any more, so a publishable-key write is refused, not stored as wrong.
-- Run as the table owner, as in lock_answers.test.sql, so the trigger alone is tested.
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT throws_ok($$INSERT INTO attempts (question_id, chosen) VALUES ('00000000-0000-0000-0000-0000000000b5', 'A')$$,
  'P0001', 'cannot grade question 00000000-0000-0000-0000-0000000000b5', 'a publishable-key attempt on a generated question is refused');
-- An other-bank question still grades.
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
INSERT INTO attempts (question_id, chosen) VALUES ('00000000-0000-0000-0000-0000000000b6', 'B');
SELECT is((SELECT correct FROM attempts WHERE question_id = '00000000-0000-0000-0000-0000000000b6'), true, 'an other-bank question still grades');

-- A random RC section still pairs: the paired passage plus one single passage per other area, all without text.
SET LOCAL role authenticated;
SELECT isnt(start_random_section('generated', 'Reading Comprehension'), NULL, 'a random RC section starts');
RESET role;
SELECT set_eq($$SELECT sq.question_id FROM session_questions sq JOIN test_sessions s ON s.id = sq.session_id
  WHERE s.kind = 'random' AND s.user_id = '00000000-0000-0000-0000-0000000000a1'$$,
  $$VALUES ('00000000-0000-0000-0000-0000000000b1'::uuid), ('00000000-0000-0000-0000-0000000000b2'::uuid),
           ('00000000-0000-0000-0000-0000000000b3'::uuid), ('00000000-0000-0000-0000-0000000000b4'::uuid)$$,
  'a random RC section takes the paired passage and the single ones without passage text');

SELECT * FROM finish();
ROLLBACK;
