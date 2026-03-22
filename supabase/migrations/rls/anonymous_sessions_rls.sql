ALTER TABLE anonymous_sessions ENABLE ROW LEVEL SECURITY;

-- Service role only — no direct user access
-- All operations go through Edge Functions using SUPABASE_SERVICE_ROLE_KEY
-- RLS blocks all anon/authenticated access; service role bypasses RLS entirely
