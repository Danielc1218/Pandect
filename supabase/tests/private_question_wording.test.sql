-- Question wording stays server-side: signed-in users read the index columns only, the publishable key reads nothing,
-- and every view and function users reach still works on an other-bank fixture.
BEGIN;
SELECT plan(33);

INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-0000000000a1', 'wording@example.com');
INSERT INTO tests (id, name, source) VALUES ('pqw-ot', 'Wording test', 'other');
INSERT INTO passages (id, test_id, passage_text, topic) VALUES
  ('00000000-0000-0000-0000-0000000000d1', 'pqw-ot', 'Passage A. One view. Passage B. Another.', 'Law'),
  ('00000000-0000-0000-0000-0000000000d2', 'pqw-ot', 'A single passage.', 'Science');
INSERT INTO questions (id, test_id, section_type, section_number, question_number, question_type, passage_id, stimulus, prompt, options, correct_answer, ready) VALUES
  ('00000000-0000-0000-0000-0000000000b1', 'pqw-ot', 'Logical Reasoning', 1, 1, 'Flaw', NULL, 'Some argument.', 'Which flaw?', '{"A":"a","B":"b"}', 'B', true),
  ('00000000-0000-0000-0000-0000000000b2', 'pqw-ot', 'Logical Reasoning', 1, 2, 'Flaw', NULL, 'Another argument.', 'Which flaw?', '{"A":"a","B":"b"}', 'A', true),
  ('00000000-0000-0000-0000-0000000000b3', 'pqw-ot', 'Reading Comprehension', 2, 1, 'Main Point', '00000000-0000-0000-0000-0000000000d1', NULL, 'Main point?', '{"A":"a","B":"b"}', 'A', true),
  ('00000000-0000-0000-0000-0000000000b4', 'pqw-ot', 'Reading Comprehension', 2, 2, 'Main Point', '00000000-0000-0000-0000-0000000000d2', NULL, 'Main point?', '{"A":"a","B":"b"}', 'A', true);
-- One graded drill attempt, written as the server does, so the per-user views have a row.
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
INSERT INTO attempts (user_id, question_id, chosen, correct) VALUES ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', 'B', true);

-- The publishable key without a session (anon) has no access at all.
SELECT ok(NOT has_any_column_privilege('anon', 'public.questions', 'SELECT'), 'anon cannot read any question column');
SELECT ok(NOT has_any_column_privilege('anon', 'public.passages', 'SELECT'), 'anon cannot read any passage column');
-- The secret key still reads everything.
SELECT ok(has_column_privilege('service_role', 'public.questions', 'stimulus', 'SELECT'), 'service_role reads stimulus');
SELECT ok(has_column_privilege('service_role', 'public.passages', 'passage_text', 'SELECT'), 'service_role reads passage_text');

SET LOCAL role anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT throws_ok('SELECT id FROM questions', '42501', NULL, 'anon cannot select questions');
SELECT throws_ok('SELECT id FROM passages', '42501', NULL, 'anon cannot select passages');
RESET role;

SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
SELECT throws_ok('SELECT stimulus FROM questions', '42501', NULL, 'users cannot read stimulus');
SELECT throws_ok('SELECT prompt FROM questions', '42501', NULL, 'users cannot read prompt');
SELECT throws_ok('SELECT options FROM questions', '42501', NULL, 'users cannot read options');
SELECT throws_ok('SELECT * FROM questions', '42501', NULL, 'users cannot select every question column');
SELECT throws_ok('SELECT passage_text FROM passages', '42501', NULL, 'users cannot read passage_text');
SELECT throws_ok('SELECT correct_answer FROM questions', '42501', NULL, 'users still cannot read correct_answer');
SELECT results_eq($$SELECT id, question_type, passage_id, ready FROM questions WHERE test_id = 'pqw-ot' ORDER BY question_number, section_number$$,
  $$VALUES ('00000000-0000-0000-0000-0000000000b1'::uuid, 'Flaw', NULL::uuid, true), ('00000000-0000-0000-0000-0000000000b3'::uuid, 'Main Point', '00000000-0000-0000-0000-0000000000d1'::uuid, true),
           ('00000000-0000-0000-0000-0000000000b2'::uuid, 'Flaw', NULL::uuid, true), ('00000000-0000-0000-0000-0000000000b4'::uuid, 'Main Point', '00000000-0000-0000-0000-0000000000d2'::uuid, true)$$,
  'users read id, question_type, passage_id and ready');
SELECT lives_ok($$SELECT id, test_id, section_type, section_number, question_number, question_type, passage_id, tags, source_number, ready FROM questions$$,
  'users read every index column of questions');
SELECT results_eq($$SELECT id, paired FROM passages WHERE test_id = 'pqw-ot' ORDER BY id$$,
  $$VALUES ('00000000-0000-0000-0000-0000000000d1'::uuid, true), ('00000000-0000-0000-0000-0000000000d2'::uuid, false)$$, 'users read id and paired');
SELECT lives_ok('SELECT id, test_id, topic, paired FROM passages', 'users read every index column of passages');

-- Views users read.
SELECT results_eq($$SELECT section_type, question_type, total FROM bank_type_counts WHERE bank = 'other' ORDER BY 1$$,
  $$VALUES ('Logical Reasoning', 'Flaw', 2), ('Reading Comprehension', 'Main Point', 2)$$, 'bank_type_counts returns the fixture');
SELECT results_eq($$SELECT section_number, section_type, questions, passages FROM bank_test_sections WHERE test_id = 'pqw-ot' ORDER BY 1$$,
  $$VALUES (1, 'Logical Reasoning', 2, 0), (2, 'Reading Comprehension', 2, 2)$$, 'bank_test_sections returns the fixture');
SELECT results_eq($$SELECT section_type, question_type, answered, correct FROM my_bank_type_stats WHERE bank = 'other'$$,
  $$VALUES ('Logical Reasoning', 'Flaw', 1, 1)$$, 'my_bank_type_stats returns the user''s attempt');
SELECT ok((SELECT count(*) FROM question_type_counts) > 0, 'question_type_counts returns rows');
SELECT results_eq($$SELECT section_type, question_type, answered, correct FROM my_type_stats$$,
  $$VALUES ('Logical Reasoning', 'Flaw', 1, 1)$$, 'my_type_stats returns the user''s attempt');
SELECT results_eq($$SELECT section_number, questions FROM test_sections WHERE test_id = 'pqw-ot' ORDER BY 1$$,
  $$VALUES (1, 2), (2, 2)$$, 'test_sections returns the fixture');
-- The history page embeds each attempt's question type (lib/data.ts).
SELECT results_eq($$SELECT a.correct, q.section_type, q.question_type FROM attempts a JOIN questions q ON q.id = a.question_id$$,
  $$VALUES (true, 'Logical Reasoning', 'Flaw')$$, 'attempts join their question''s type');

-- Functions users call.
SELECT is(next_question('Logical Reasoning', 'Flaw', 'other'), '00000000-0000-0000-0000-0000000000b2'::uuid, 'next_question (by bank) works');
SELECT isnt(next_question('Logical Reasoning', 'Flaw'), NULL, 'next_question works');
SELECT isnt(start_random_section('other', 'Logical Reasoning', 50), NULL, 'a random LR section starts');
SELECT isnt(start_random_section('other', 'Reading Comprehension'), NULL, 'a random RC section starts');
SELECT lives_ok($$INSERT INTO test_sessions (id, test_id, section_number) VALUES ('00000000-0000-0000-0000-0000000000c1', 'pqw-ot', 2)$$,
  'a fixed section starts');
SELECT results_eq($$SELECT position, question_id FROM session_questions WHERE session_id = '00000000-0000-0000-0000-0000000000c1' ORDER BY 1$$,
  $$VALUES (1, '00000000-0000-0000-0000-0000000000b3'::uuid), (2, '00000000-0000-0000-0000-0000000000b4'::uuid)$$,
  'fill_fixed_session fills it, and its owner reads which questions it holds');
SELECT is((SELECT count(*) FROM session_choices('00000000-0000-0000-0000-0000000000c1'))::int, 0, 'session_choices works');
SELECT lives_ok($$UPDATE test_sessions SET finished_at = now() WHERE id = '00000000-0000-0000-0000-0000000000c1'$$, 'the section finishes');
SELECT results_eq($$SELECT score_correct, score_total FROM test_sessions WHERE id = '00000000-0000-0000-0000-0000000000c1'$$,
  $$VALUES (0, 2)$$, 'and is scored');
RESET role;

SELECT set_eq($$SELECT sq.question_id FROM session_questions sq JOIN test_sessions s ON s.id = sq.session_id
                WHERE s.kind = 'random' AND s.section_type = 'Reading Comprehension' AND s.user_id = '00000000-0000-0000-0000-0000000000a1'$$,
  $$VALUES ('00000000-0000-0000-0000-0000000000b3'::uuid), ('00000000-0000-0000-0000-0000000000b4'::uuid)$$,
  'the random RC section pairs passages without reading their text');

SELECT * FROM finish();
ROLLBACK;
