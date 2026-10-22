-- Users get only ready questions (their files are deployed): in counts, drills, random sections and fixed sections.
BEGIN;
SELECT plan(21);

SELECT has_column('public', 'questions', 'ready', 'questions have a ready flag');
SELECT hasnt_column('public', 'questions', 'published', 'the flag is no longer called published');
SELECT col_not_null('public', 'questions', 'ready', 'ready is never NULL');
SELECT col_default_is('public', 'questions', 'ready', 'false', 'ready defaults to false');
SELECT imatches(col_description('public.questions'::regclass,
  (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.questions'::regclass AND attname = 'ready')), 'deployed, not public',
  'the column says ready means deployed, not public');

INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-0000000000a1', 'pub@example.com');
INSERT INTO tests (id, name, source) VALUES ('pub-test', 'Publish test', 'generated');
INSERT INTO passages (id, test_id, passage_text, topic) VALUES
  ('00000000-0000-0000-0000-0000000000d1', 'pub-test', 'A ready passage.', 'Science'),
  ('00000000-0000-0000-0000-0000000000d2', 'pub-test', 'A passage not ready.', 'Law');
-- New rows start not ready; the ready ones are marked as the exporter would after verifying the CDN.
-- The LR question not ready comes first, so anything that ignored the flag would pick it.
INSERT INTO questions (id, test_id, section_type, section_number, question_number, question_type, passage_id, prompt, options, correct_answer) VALUES
  ('00000000-0000-0000-0000-0000000000b1', 'pub-test', 'Logical Reasoning', 1, 1, 'Flaw', NULL, 'Not ready?', '{"A":"a"}', 'A'),
  ('00000000-0000-0000-0000-0000000000b2', 'pub-test', 'Logical Reasoning', 1, 2, 'Flaw', NULL, 'Ready?', '{"A":"a"}', 'A'),
  ('00000000-0000-0000-0000-0000000000b3', 'pub-test', 'Reading Comprehension', 2, 1, 'Main Point', '00000000-0000-0000-0000-0000000000d1', 'Ready?', '{"A":"a"}', 'A'),
  ('00000000-0000-0000-0000-0000000000b4', 'pub-test', 'Reading Comprehension', 2, 2, 'Main Point', '00000000-0000-0000-0000-0000000000d2', 'Not ready?', '{"A":"a"}', 'A');
SELECT is((SELECT count(*) FROM questions WHERE ready)::int, 0, 'new questions start not ready');
UPDATE questions SET ready = true WHERE id IN ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b3');

SELECT ok(has_column_privilege('authenticated', 'public.questions', 'ready', 'SELECT'), 'users can read ready');

SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

SELECT results_eq($$SELECT section_type, question_type, total FROM bank_type_counts WHERE bank = 'generated' ORDER BY 1$$,
  $$VALUES ('Logical Reasoning', 'Flaw', 1), ('Reading Comprehension', 'Main Point', 1)$$, 'type counts include only ready questions');
SELECT results_eq($$SELECT section_number, questions FROM bank_test_sections WHERE test_id = 'pub-test' ORDER BY 1$$,
  $$VALUES (1, 1), (2, 1)$$, 'test sections count only ready questions');

SELECT is(next_question('Logical Reasoning', 'Flaw', 'generated'), '00000000-0000-0000-0000-0000000000b2'::uuid, 'next_question (by bank) skips questions not ready');
SELECT is(next_question('Logical Reasoning', 'Flaw'), '00000000-0000-0000-0000-0000000000b2'::uuid, 'next_question skips questions not ready');
SELECT is(next_question('Reading Comprehension', 'Main Point', 'generated'), '00000000-0000-0000-0000-0000000000b3'::uuid, 'next_question finds a ready RC question');

SELECT isnt(start_random_section('generated', 'Logical Reasoning', 50), NULL, 'a random LR section starts');
SELECT isnt(start_random_section('generated', 'Reading Comprehension'), NULL, 'a random RC section starts');
INSERT INTO test_sessions (id, test_id, section_number) VALUES ('00000000-0000-0000-0000-0000000000c1', 'pub-test', 1);
RESET role;

SELECT results_eq($$SELECT sq.question_id FROM session_questions sq JOIN test_sessions s ON s.id = sq.session_id WHERE s.kind = 'random' AND s.section_type = 'Logical Reasoning'$$,
  $$VALUES ('00000000-0000-0000-0000-0000000000b2'::uuid)$$, 'a random LR section has only ready questions');
SELECT results_eq($$SELECT sq.question_id FROM session_questions sq JOIN test_sessions s ON s.id = sq.session_id WHERE s.kind = 'random' AND s.section_type = 'Reading Comprehension'$$,
  $$VALUES ('00000000-0000-0000-0000-0000000000b3'::uuid)$$, 'a random RC section has only ready passages and questions');
SELECT results_eq($$SELECT question_id, position FROM session_questions WHERE session_id = '00000000-0000-0000-0000-0000000000c1'$$,
  $$VALUES ('00000000-0000-0000-0000-0000000000b2'::uuid, 1)$$, 'a fixed section has only ready questions');

-- Nothing ready: no random section, and next_question finds nothing.
UPDATE questions SET ready = false;
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
SELECT throws_ok($$SELECT start_random_section('generated', 'Logical Reasoning', 25)$$, 'P0001',
  'No Logical Reasoning questions in the generated bank', 'no random section from questions not ready');
SELECT is(next_question('Logical Reasoning', 'Flaw', 'generated'), NULL, 'no drill question when none is ready');
SELECT is((SELECT count(*) FROM bank_type_counts WHERE bank = 'generated')::int, 0, 'no counts when none is ready');
SELECT lives_ok('SELECT * FROM my_bank_type_stats', 'my_bank_type_stats still works');
RESET role;

SELECT * FROM finish();
ROLLBACK;
