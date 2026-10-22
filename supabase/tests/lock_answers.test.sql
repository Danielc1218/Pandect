-- Answers stay out of users' reach, and only the server can write a grade it chose.
BEGIN;
SELECT plan(22);

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'lock@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'other@example.com');
INSERT INTO tests (id, name, source) VALUES ('lock-test', 'Lock test', 'generated');
INSERT INTO questions (id, test_id, section_type, section_number, question_number, question_type, prompt, options, correct_answer)
  VALUES ('00000000-0000-0000-0000-0000000000b1', 'lock-test', 'Logical Reasoning', 1, 1, 'Flaw', 'Which one?',
          '{"A":"a","B":"b","C":"c","D":"d","E":"e"}', 'C');
INSERT INTO test_sessions (id, user_id, test_id, section_number) VALUES
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'lock-test', 1),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a2', 'lock-test', 1);

SELECT ok(NOT has_column_privilege('authenticated', 'public.questions', 'correct_answer', 'SELECT'), 'users cannot read correct_answer');
SELECT ok(NOT has_column_privilege('authenticated', 'public.questions', 'explanation', 'SELECT'), 'users cannot read explanation');
SELECT ok(has_column_privilege('authenticated', 'public.questions', 'prompt', 'SELECT'), 'users can still read prompt');

-- The grading trigger for a non-secret-key writer, run as the table owner (which skips the row rules and the
-- table grants that now stop users) so that the trigger alone is what is tested.
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
INSERT INTO attempts (user_id, question_id, chosen, correct) VALUES
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000b1', 'A', true);
SELECT is((SELECT correct FROM attempts WHERE chosen = 'A'), false, 'the database regrades a browser write');
SELECT is((SELECT user_id FROM attempts WHERE chosen = 'A'), '00000000-0000-0000-0000-0000000000a1'::uuid, 'a browser-given user_id is overwritten');
UPDATE attempts SET correct = true, user_id = '00000000-0000-0000-0000-0000000000a2' WHERE chosen = 'A';
SELECT is((SELECT correct FROM attempts WHERE chosen = 'A'), false, 'a forged UPDATE of correct is regraded');
SELECT is((SELECT user_id FROM attempts WHERE chosen = 'A'), '00000000-0000-0000-0000-0000000000a1'::uuid, 'a forged UPDATE of user_id is overwritten');
-- A question the database cannot grade is refused (a missing question grades to NULL).
SELECT throws_ok(
  $$INSERT INTO attempts (question_id, chosen) VALUES ('00000000-0000-0000-0000-0000000000ff', 'A')$$,
  'P0001', 'cannot grade question 00000000-0000-0000-0000-0000000000ff', 'ungradable attempt is refused');

-- The secret key's grade and user are kept, and it has to give both.
SET LOCAL role service_role;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
INSERT INTO attempts (user_id, session_id, question_id, chosen, correct) VALUES
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'B', true),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', 'B', true);
SELECT is((SELECT correct FROM attempts WHERE session_id = '00000000-0000-0000-0000-0000000000c1'), true, 'service_role keeps the correct it was given');
SELECT is((SELECT user_id FROM attempts WHERE session_id = '00000000-0000-0000-0000-0000000000c1'), '00000000-0000-0000-0000-0000000000a1'::uuid, 'service_role keeps the user_id it was given');
SELECT throws_ok(
  $$INSERT INTO attempts (user_id, question_id, chosen, correct) VALUES ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', 'D', NULL)$$,
  'P0001', 'service_role must give user_id and correct', 'service_role cannot give a NULL correct');
SELECT throws_ok(
  $$INSERT INTO attempts (user_id, question_id, chosen) VALUES ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', 'D')$$,
  'P0001', 'service_role must give user_id and correct', 'service_role cannot leave correct out');
RESET role;

-- A signed-in user.
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
SELECT throws_ok(
  $$INSERT INTO attempts (question_id, chosen) VALUES ('00000000-0000-0000-0000-0000000000b1', 'E')$$,
  '42501', NULL, 'users cannot insert attempts');
SELECT throws_ok($$UPDATE attempts SET correct = true$$, '42501', NULL, 'users cannot update attempts');
SELECT is((SELECT count(*) FROM attempts WHERE session_id = '00000000-0000-0000-0000-0000000000c1')::int, 0, 'an unfinished section''s attempt is hidden');
SELECT is((SELECT count(*) FROM attempts WHERE session_id IS NULL)::int, 1, 'a drill attempt is visible');
SELECT results_eq($$SELECT question_id, chosen FROM session_choices('00000000-0000-0000-0000-0000000000c1')$$,
  $$VALUES ('00000000-0000-0000-0000-0000000000b1'::uuid, 'B')$$, 'session_choices returns the user''s own choices');
SELECT is((SELECT count(*) FROM session_choices('00000000-0000-0000-0000-0000000000c2'))::int, 0, 'session_choices hides another user''s section');
SELECT lives_ok('SELECT * FROM my_bank_type_stats', 'my_bank_type_stats still works');
SELECT lives_ok('SELECT * FROM bank_type_counts', 'bank_type_counts still works');
SELECT lives_ok('SELECT * FROM bank_test_sections', 'bank_test_sections still works');
RESET role;

UPDATE test_sessions SET finished_at = now() WHERE id = '00000000-0000-0000-0000-0000000000c1';
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
SELECT is((SELECT count(*) FROM attempts WHERE session_id = '00000000-0000-0000-0000-0000000000c1')::int, 1, 'a finished section''s attempt becomes visible');
RESET role;

SELECT * FROM finish();
ROLLBACK;
