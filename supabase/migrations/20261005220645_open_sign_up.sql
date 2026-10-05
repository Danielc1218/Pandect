-- Sign-up is open again: access is managed by hand (who gets the link, and removing users in the
-- dashboard), so the invitation list from invite_only is removed.
DROP TRIGGER require_invitation ON auth.users;
DROP FUNCTION require_invitation();
DROP TABLE allowed_emails;
