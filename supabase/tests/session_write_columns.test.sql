-- Users start, pause and finish their own sections, but can't write a score, a bank or a start time.
BEGIN;
SELECT plan(5);

INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-0000000000a1', 'swc@example.com');
INSERT INTO tests (id, name, source) VALUES ('swc-test', 'Write test', 'generated');
INSERT INTO questions (id, test_id, section_type, section_number, question_number, question_type, prompt, options, correct_answer, ready)
  VALUES ('00000000-0000-0000-0000-0000000000b1', 'swc-test', 'Logical Reasoning', 1, 1, 'Flaw', 'Which one?', '{"A":"a","B":"b"}', 'B', true);

SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

SELECT lives_ok($$INSERT INTO test_sessions (id, test_id, section_number) VALUES ('00000000-0000-0000-0000-0000000000c1', 'swc-test', 1)$$,
  'a section starts');
SELECT throws_ok($$INSERT INTO test_sessions (test_id, section_number, finished_at, score_correct, score_total) VALUES ('swc-test', 1, now(), 1, 1)$$,
  '42501', NULL, 'a finished, scored section cannot be inserted');
SELECT throws_ok($$UPDATE test_sessions SET started_at = now() - interval '1 day' WHERE id = '00000000-0000-0000-0000-0000000000c1'$$,
  '42501', NULL, 'the start time cannot be moved');
SELECT lives_ok($$UPDATE test_sessions SET paused_at = now() WHERE id = '00000000-0000-0000-0000-0000000000c1'$$, 'the section pauses');
SELECT lives_ok($$UPDATE test_sessions SET paused_at = NULL, paused_seconds = 5, finished_at = now() WHERE id = '00000000-0000-0000-0000-0000000000c1'$$,
  'the section resumes and finishes');

SELECT * FROM finish();
ROLLBACK;
