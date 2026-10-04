-- Newer hosted projects don't auto-grant table privileges to API roles.
-- RLS policies still decide which rows each role sees.
GRANT SELECT ON tests, passages, questions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT ALL ON tests, passages, questions, profiles TO service_role;
