ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Public SELECT (cached via Next.js unstable_cache — no user auth required)
CREATE POLICY "system_config_select_public" ON system_config
  FOR SELECT USING (true);

-- Admin-only UPDATE
CREATE POLICY "system_config_update_admin" ON system_config
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
