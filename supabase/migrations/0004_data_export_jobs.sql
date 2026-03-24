-- Migration: data_export_jobs table for GDPR personal data export (Story 2.4)
CREATE TABLE IF NOT EXISTS data_export_jobs (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        TEXT         NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'processing', 'ready', 'failed', 'expired')),
  file_path     TEXT,        -- storage path: '{userId}/{jobId}.json'; null until ready
  expires_at    TIMESTAMPTZ, -- 48h after export is ready; null until ready
  error_message TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_export_jobs_user_status ON data_export_jobs(user_id, status);
CREATE INDEX idx_export_jobs_pending     ON data_export_jobs(status, created_at)
  WHERE status = 'pending';

ALTER TABLE data_export_jobs ENABLE ROW LEVEL SECURITY;

-- Users can read their own export jobs
CREATE POLICY "Users can read own export jobs"
  ON data_export_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own export jobs (Server Action uses user client with anon key + JWT)
CREATE POLICY "Users can create own export jobs"
  ON data_export_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE is service-role only (Edge Function); no user-facing RLS UPDATE policy needed
