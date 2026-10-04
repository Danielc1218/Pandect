-- SECURITY DEFINER functions shouldn't be callable through the API or resolve
-- names via a caller-controlled search_path. Triggers still fire without EXECUTE.
ALTER FUNCTION handle_new_user() SET search_path = public;
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;

-- rls_auto_enable is created by the hosted platform (ensure_rls event trigger),
-- so it doesn't exist on a local stack.
DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;
