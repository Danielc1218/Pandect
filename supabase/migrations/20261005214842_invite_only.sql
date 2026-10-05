-- Invite-only sign-up: an account can only be created for an email listed in allowed_emails.
-- Enforced in the database, so it holds even if someone calls the auth API directly.
-- Invite someone:  INSERT INTO allowed_emails (email) VALUES ('person@example.com');

CREATE TABLE allowed_emails (
  email TEXT PRIMARY KEY CHECK (email = lower(email)),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Row-level security with no policies: only the service role and the dashboard can read or change it.
ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;
GRANT ALL ON allowed_emails TO service_role;

CREATE FUNCTION require_invitation() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM allowed_emails WHERE email = lower(NEW.email)) THEN
    RAISE EXCEPTION 'Sign-ups are by invitation only';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION require_invitation() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER require_invitation BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION require_invitation();
