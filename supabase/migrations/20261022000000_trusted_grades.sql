-- Trusted grades: the question generator writes attempts with the secret key (role service_role),
-- so grade_attempt keeps the user and grade it gives. A browser write is still graded by the database.
-- It is SECURITY DEFINER so it can read correct_answer once users lose the right to select it.
CREATE OR REPLACE FUNCTION grade_attempt() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    IF NEW.user_id IS NULL OR NEW.correct IS NULL THEN
      RAISE EXCEPTION 'service_role must give user_id and correct';
    END IF;
    RETURN NEW;
  END IF;
  NEW.user_id := auth.uid();
  NEW.correct := (SELECT q.correct_answer = NEW.chosen FROM questions q WHERE q.id = NEW.question_id);
  -- A question the database cannot grade is refused, not stored as wrong.
  IF NEW.correct IS NULL THEN
    RAISE EXCEPTION 'cannot grade question %', NEW.question_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION grade_attempt() FROM PUBLIC, anon, authenticated;

-- No default grade: a secret-key write that leaves out `correct` is refused, not stored as wrong.
ALTER TABLE attempts ALTER COLUMN correct DROP DEFAULT;
