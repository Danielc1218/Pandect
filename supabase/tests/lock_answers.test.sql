-- Answers stay out of users' reach, and only the server can write a grade it chose.
BEGIN;
SELECT plan(11);

INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-0000000000a1', 'lock@example.com');
INSERT INTO tests (id, name, source) VALUES ('lock-test', 'Lock test', 'generated');
INSERT INTO questions (id, test_id, section_type, section_number, question_number, question_type, prompt, options, correct_answer)
  VALUES ('00000000-0000-0000-0000-0000000000b1', 'lock-test', 'Logical Reasoning', 1, 1, 'Flaw', 'Which one?',
          '{"A":"a","B":"b","C":"c","D":"d","E":"e"}', 'C');

SELECT ok(NOT has_column_privilege('authenticated', 'public.questions', 'correct_answer', 'SELECT'), 'users cannot read correct_answer');
SELECT ok(NOT has_column_privilege('authenticated', 'public.questions', 'explanation', 'SELECT'), 'users cannot read explanation');
SELECT ok(has_column_privilege('authenticated', 'public.questions', 'prompt', 'SELECT'), 'users can still read prompt');

-- A signed-in user cannot record a wrong answer as right.
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
INSERT INTO attempts (question_id, chosen, correct) VALUES ('00000000-0000-0000-0000-0000000000b1', 'A', true);
SELECT is((SELECT correct FROM attempts WHERE chosen = 'A'), false, 'the database regrades a browser write');

-- A question the database cannot grade is refused (a missing question grades to NULL).
SELECT throws_ok(
  $$INSERT INTO attempts (question_id, chosen) VALUES ('00000000-0000-0000-0000-0000000000ff', 'A')$$,
  'P0001', 'cannot grade question 00000000-0000-0000-0000-0000000000ff', 'ungradable attempt is refused');

SELECT lives_ok('SELECT * FROM my_bank_type_stats', 'my_bank_type_stats still works');
SELECT lives_ok('SELECT * FROM bank_type_counts', 'bank_type_counts still works');
SELECT lives_ok('SELECT * FROM bank_test_sections', 'bank_test_sections still works');
RESET role;

-- The secret key's grade and user are kept.
SET LOCAL role service_role;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
INSERT INTO attempts (user_id, question_id, chosen, correct) VALUES ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', 'B', true);
SELECT is((SELECT correct FROM attempts WHERE chosen = 'B'), true, 'service_role keeps the correct it was given');
SELECT is((SELECT user_id FROM attempts WHERE chosen = 'B'), '00000000-0000-0000-0000-0000000000a1'::uuid, 'service_role keeps the user_id it was given');
SELECT throws_ok(
  $$INSERT INTO attempts (user_id, question_id, chosen, correct) VALUES ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', 'D', NULL)$$,
  'P0001', 'service_role must give user_id and correct', 'service_role must say whose attempt it is and whether it was correct');
RESET role;

SELECT * FROM finish();
ROLLBACK;
