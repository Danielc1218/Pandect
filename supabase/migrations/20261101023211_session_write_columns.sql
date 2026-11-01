-- Signed-in users write test_sessions only through the columns the site sends: a new fixed section names its test and
-- section, and a running section is paused, resumed or finished. Scores, banks, kinds and start times are set by the
-- triggers and functions, so a user can't insert a finished, scored session or move a section's start time.
REVOKE INSERT, UPDATE ON test_sessions FROM authenticated;
GRANT INSERT (id, test_id, section_number) ON test_sessions TO authenticated;
GRANT UPDATE (finished_at, paused_at, paused_seconds) ON test_sessions TO authenticated;

-- The Data API never offers these, but nothing needs them either.
REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLES FROM anon, authenticated;
