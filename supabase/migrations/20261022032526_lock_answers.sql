-- Keep the answers out of users' reach: a signed-in user can read every question column except the
-- correct answer and its explanation. The views only count rows, and grading runs as the function owner.
REVOKE SELECT ON questions FROM authenticated;
GRANT SELECT (id, test_id, section_type, section_number, question_number, question_type, passage_id, stimulus, prompt, options, tags)
  ON questions TO authenticated;

-- A grade is a hint at the answer, so users may not write attempts (the server does, with the secret key)
-- and may not read the grade of a section still in progress, or they could try each letter and read it back.
REVOKE INSERT, UPDATE ON attempts FROM authenticated;
DROP POLICY "Users manage own attempts" ON attempts;
CREATE POLICY "Users read own settled attempts" ON attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND (session_id IS NULL
    OR EXISTS (SELECT 1 FROM test_sessions s WHERE s.id = session_id AND s.finished_at IS NOT NULL)));

-- What the caller has chosen so far in one of their own sections, for restoring it. No grades.
CREATE FUNCTION session_choices(p_session UUID) RETURNS TABLE (question_id UUID, chosen TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.question_id, a.chosen FROM attempts a
  JOIN test_sessions s ON s.id = a.session_id
  WHERE a.session_id = p_session AND s.user_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION session_choices(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION session_choices(UUID) TO authenticated;
