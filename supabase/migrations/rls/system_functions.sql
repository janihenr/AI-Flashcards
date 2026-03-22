-- SECURITY DEFINER helper — bypasses RLS to look up the system user ID by well-known email.
-- Used in RLS policies that grant cold-start deck access to anonymous/authenticated users.
--
-- Why SECURITY DEFINER and not current_setting():
--   Supabase Pooler runs in transaction mode — session-level SET commands are rejected.
--   A STABLE SECURITY DEFINER function is evaluated once per transaction and cached,
--   giving good performance without any session variable plumbing.
--
-- Run this file before applying decks_rls.sql and cards_rls.sql.
CREATE OR REPLACE FUNCTION get_system_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT id FROM auth.users WHERE email = 'system@internal.flashcards.app' LIMIT 1
$$;
