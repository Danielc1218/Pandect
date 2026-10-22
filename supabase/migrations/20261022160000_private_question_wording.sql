-- Keep question wording server-side, as lock_answers did for the answers. Sign-up is open, so any signed-in user
-- could read every other-bank question's stimulus, prompt and options, and every passage's text, straight from the
-- API with the publishable key. Now users read only the index columns; the site's server reads wording with the
-- secret key (service_role), and the generated bank's wording was never here.
REVOKE SELECT ON questions FROM authenticated;
GRANT SELECT (id, test_id, section_type, section_number, question_number, question_type, passage_id, tags, source_number, ready)
  ON questions TO authenticated;

REVOKE SELECT ON passages FROM authenticated;
GRANT SELECT (id, test_id, topic, paired) ON passages TO authenticated;

-- The publishable key without a session never reads questions (the row rules were for authenticated only),
-- but Supabase's default privileges gave anon the tables anyway: take them back.
REVOKE ALL ON questions, passages FROM anon;

-- What users still reach, checked against the columns above:
--   views (security_invoker): bank_type_counts, bank_test_sections, my_bank_type_stats, question_type_counts,
--     my_type_stats and test_sections read only id, test_id, section_type, section_number, question_type,
--     passage_id and ready;
--   next_question (both, invoker) reads id, ready, test_id, section_type, section_number, question_number, question_type;
--   start_random_section, fill_fixed_session, session_choices, score_session and grade_attempt are SECURITY DEFINER.
