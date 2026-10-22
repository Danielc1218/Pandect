-- Keep the answers out of users' reach: a signed-in user can read every question column except the
-- correct answer and its explanation. The views only count rows, and grading runs as the function owner.
REVOKE SELECT ON questions FROM authenticated;
GRANT SELECT (id, test_id, section_type, section_number, question_number, question_type, passage_id, stimulus, prompt, options, tags)
  ON questions TO authenticated;
