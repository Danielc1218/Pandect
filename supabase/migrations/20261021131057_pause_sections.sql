-- Save and exit stops a timed section's clock: paused_at is when it was left, paused_seconds the time spent away
-- over every pause, which the clock and the section's total time leave out.
ALTER TABLE test_sessions
  ADD COLUMN paused_at TIMESTAMPTZ,
  ADD COLUMN paused_seconds INT NOT NULL DEFAULT 0 CHECK (paused_seconds >= 0);

-- A finished section's time is history too, like its score.
CREATE OR REPLACE FUNCTION score_session() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.finished_at IS NOT NULL THEN
    NEW.finished_at := OLD.finished_at;
    NEW.score_correct := OLD.score_correct;
    NEW.score_total := OLD.score_total;
    NEW.paused_at := OLD.paused_at;
    NEW.paused_seconds := OLD.paused_seconds;
  ELSIF NEW.finished_at IS NOT NULL THEN
    NEW.score_total := (SELECT count(*) FROM session_questions WHERE session_id = NEW.id);
    NEW.score_correct := (SELECT count(*) FROM attempts a
                          JOIN session_questions sq ON sq.session_id = a.session_id AND sq.question_id = a.question_id
                          WHERE a.session_id = NEW.id AND a.correct);
  ELSE
    NEW.score_correct := NULL;
    NEW.score_total := NULL;
  END IF;
  RETURN NEW;
END;
$$;
