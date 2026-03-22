ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Admin-only SELECT
CREATE POLICY "analytics_events_select_admin" ON analytics_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Service role INSERT only (via DAL trackEvent() — no direct user INSERT)
-- No INSERT policy for authenticated users — only service role bypasses RLS for inserts
