-- The generated bank laid out as practice tests shaped like real ones: LR sections 1 and 3 of 25, RC section 2 of 4 passages.
-- The fixture is the same as tests/test_import_generated.py's: 60 LR questions numbered 2, 4, ... 120, and six passages
-- whose smallest numbers rank them p1, p2, p4, p3, p5, p6. It starts in the old layout (GEN-LR or GEN-RC, section 1, number).
BEGIN;
SELECT plan(19);

SELECT has_column('public', 'questions', 'source_number', 'questions have a source_number');
SELECT col_is_unique('public', 'questions', ARRAY['source_number'], 'source_number is unique');
SELECT is(has_function_privilege('authenticated', 'layout_generated_tests()', 'execute'), false, 'users cannot re-lay the bank');

INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-0000000000a1', 'gpt@example.com');
INSERT INTO tests (id, name, source) VALUES
  ('GEN-LR', 'Generated Logical Reasoning', 'generated'), ('GEN-RC', 'Generated Reading Comprehension', 'generated'),
  ('gpt-ot', 'Other', 'other');
INSERT INTO questions (id, test_id, section_type, section_number, question_number, question_type, ready)
SELECT md5('lr' || n)::uuid, 'GEN-LR', 'Logical Reasoning', 1, n, 'Flaw', true FROM generate_series(2, 120, 2) n;
INSERT INTO passages (id, test_id, topic) SELECT md5(p)::uuid, 'GEN-RC', 'Law' FROM unnest(ARRAY['p1', 'p2', 'p3', 'p4', 'p5', 'p6']) p;
INSERT INTO questions (id, test_id, section_type, section_number, question_number, question_type, passage_id, ready)
SELECT md5('rc' || n)::uuid, 'GEN-RC', 'Reading Comprehension', 1, n, 'Main Point', md5(p)::uuid, true
FROM (VALUES ('p1', 211), ('p1', 213), ('p1', 215), ('p2', 222), ('p2', 212), ('p2', 221), ('p3', 301), ('p3', 302),
             ('p4', 241), ('p4', 242), ('p4', 243), ('p5', 401), ('p6', 402), ('p6', 403)) v (p, n);
INSERT INTO passages (id, test_id, passage_text, topic) VALUES ('00000000-0000-0000-0000-0000000000d1', 'gpt-ot', 'Passage A. One.', 'Law');
INSERT INTO questions (id, test_id, section_type, section_number, question_number, question_type, passage_id, prompt, options, correct_answer) VALUES
  ('00000000-0000-0000-0000-0000000000b1', 'gpt-ot', 'Logical Reasoning', 1, 2, 'Flaw', NULL, 'Which?', '{"A":"a"}', 'A'),
  ('00000000-0000-0000-0000-0000000000b2', 'gpt-ot', 'Reading Comprehension', 2, 1, 'Main Point', '00000000-0000-0000-0000-0000000000d1', 'Which?', '{"A":"a"}', 'A');

-- History on the old layout: a finished fixed section of GEN-LR with two answers.
INSERT INTO test_sessions (id, user_id, test_id, section_number)
  VALUES ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'GEN-LR', 1);
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
INSERT INTO attempts (user_id, question_id, session_id, chosen, correct) VALUES
  ('00000000-0000-0000-0000-0000000000a1', md5('lr2')::uuid, '00000000-0000-0000-0000-0000000000c1', 'A', true),
  ('00000000-0000-0000-0000-0000000000a1', md5('lr4')::uuid, '00000000-0000-0000-0000-0000000000c1', 'B', false);
UPDATE test_sessions SET finished_at = now() WHERE id = '00000000-0000-0000-0000-0000000000c1';
SELECT set_config('request.jwt.claims', '', true);

CREATE TEMP TABLE before AS SELECT
  (SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM test_sessions s) AS sessions,
  (SELECT jsonb_agg(to_jsonb(sq) ORDER BY session_id, position) FROM session_questions sq) AS session_questions,
  (SELECT jsonb_agg(to_jsonb(a) ORDER BY id) FROM attempts a) AS attempts,
  (SELECT jsonb_agg(to_jsonb(q) ORDER BY id) FROM questions q WHERE test_id = 'gpt-ot') AS ot_questions,
  (SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM passages p WHERE test_id = 'gpt-ot') AS ot_passages,
  (SELECT jsonb_agg(jsonb_build_array(id, question_number) ORDER BY id) FROM questions WHERE test_id LIKE 'GEN-%') AS generated_ids;

SELECT lives_ok('SELECT layout_generated_tests()', 'the generated bank is laid out');

SELECT results_eq($$SELECT test_id, section_number, section_type, questions, passages FROM bank_test_sections
                    WHERE bank = 'generated' ORDER BY test_id, section_number$$,
  $$VALUES ('GEN-PT-01', 1, 'Logical Reasoning', 25, 0), ('GEN-PT-01', 2, 'Reading Comprehension', 11, 4),
           ('GEN-PT-01', 3, 'Logical Reasoning', 25, 0), ('GEN-PT-02', 1, 'Logical Reasoning', 10, 0),
           ('GEN-PT-02', 2, 'Reading Comprehension', 3, 2)$$,
  'LR ranks 1-25 and 26-50 make sections 1 and 3, four passages make section 2, the rest start test 2');
SELECT is((SELECT count(*)::int FROM (SELECT test_id, section_number FROM questions WHERE test_id LIKE 'GEN-PT-%'
           GROUP BY 1, 2 HAVING min(question_number) <> 1 OR max(question_number) <> count(*)) gaps), 0,
  'each section is numbered 1, 2, 3, ... with no gaps');
SELECT results_eq($$SELECT source_number, test_id, section_number, question_number FROM questions
                    WHERE source_number IN (2, 50, 52, 100, 102, 120) ORDER BY source_number$$,
  $$VALUES (2, 'GEN-PT-01', 1, 1), (50, 'GEN-PT-01', 1, 25), (52, 'GEN-PT-01', 3, 1), (100, 'GEN-PT-01', 3, 25),
           (102, 'GEN-PT-02', 1, 1), (120, 'GEN-PT-02', 1, 10)$$, 'LR questions go by rank of their permanent number');
SELECT results_eq($$SELECT source_number FROM questions WHERE test_id = 'GEN-PT-01' AND section_number = 2 ORDER BY question_number$$,
  $$VALUES (211), (213), (215), (212), (221), (222), (241), (242), (243), (301), (302)$$,
  'RC questions go by passage rank (smallest number), then number');
SELECT results_eq($$SELECT p, test_id FROM unnest(ARRAY['p1', 'p2', 'p3', 'p4', 'p5', 'p6']) p JOIN passages ON id = md5(p)::uuid ORDER BY p$$,
  $$VALUES ('p1', 'GEN-PT-01'), ('p2', 'GEN-PT-01'), ('p3', 'GEN-PT-01'), ('p4', 'GEN-PT-01'), ('p5', 'GEN-PT-02'), ('p6', 'GEN-PT-02')$$,
  'passages move to their test');
SELECT results_eq($$SELECT id, name, year, source, bank FROM tests WHERE id LIKE 'GEN-%' ORDER BY id$$,
  $$VALUES ('GEN-LR', 'Generated Logical Reasoning', NULL::int, 'generated', 'generated'),
           ('GEN-PT-01', 'Generated Practice Test 1', NULL, 'generated', 'generated'),
           ('GEN-PT-02', 'Generated Practice Test 2', NULL, 'generated', 'generated'),
           ('GEN-RC', 'Generated Reading Comprehension', NULL, 'generated', 'generated')$$,
  'one practice test per 50 LR questions or 4 passages, and the old tests stay for old sessions');
SELECT is((SELECT count(*)::int FROM questions WHERE test_id IN ('GEN-LR', 'GEN-RC')), 0, 'the old tests are empty');

SELECT is((SELECT jsonb_agg(jsonb_build_array(id, source_number) ORDER BY id) FROM questions WHERE test_id LIKE 'GEN-%'),
  (SELECT generated_ids FROM before), 'every question keeps its id, with its old number as source_number');
SELECT is((SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM test_sessions s), (SELECT sessions FROM before), 'sessions are unchanged');
SELECT is((SELECT jsonb_agg(to_jsonb(sq) ORDER BY session_id, position) FROM session_questions sq), (SELECT session_questions FROM before),
  'session questions are unchanged');
SELECT is((SELECT jsonb_agg(to_jsonb(a) ORDER BY id) FROM attempts a), (SELECT attempts FROM before), 'attempts are unchanged');
SELECT is((SELECT jsonb_agg(to_jsonb(q) ORDER BY id) FROM questions q WHERE test_id = 'gpt-ot'), (SELECT ot_questions FROM before),
  'other-bank questions are untouched (and have no source_number)');
SELECT is((SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM passages p WHERE test_id = 'gpt-ot'), (SELECT ot_passages FROM before),
  'other-bank passages are untouched');

-- Running it again moves nothing, and does not trip over UNIQUE (test_id, section_number, question_number).
CREATE TEMP TABLE laid AS SELECT id, test_id, section_number, question_number FROM questions WHERE test_id LIKE 'GEN-%';
SELECT layout_generated_tests();
SELECT set_eq('SELECT id, test_id, section_number, question_number FROM questions WHERE test_id LIKE ''GEN-%''',
  'SELECT * FROM laid', 'laying out again changes nothing');

-- A fixed section of a generated practice test holds its questions in order.
INSERT INTO test_sessions (id, user_id, test_id, section_number)
  VALUES ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a1', 'GEN-PT-01', 2);
SELECT results_eq($$SELECT q.source_number FROM session_questions sq JOIN questions q ON q.id = sq.question_id
                    WHERE sq.session_id = '00000000-0000-0000-0000-0000000000c2' ORDER BY sq.position$$,
  $$VALUES (211), (213), (215), (212), (221), (222), (241), (242), (243), (301), (302)$$, 'GEN-PT-01 section 2 starts as laid out');

SELECT * FROM finish();
ROLLBACK;
