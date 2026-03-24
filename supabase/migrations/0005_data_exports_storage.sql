-- Migration: private storage bucket for GDPR data export files (Story 2.4)
INSERT INTO storage.buckets (id, name, public)
VALUES ('data-exports', 'data-exports', false)
ON CONFLICT (id) DO NOTHING;

-- Users can read their own export files (signed URL generated server-side by admin client)
CREATE POLICY "Users can read own export files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'data-exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Uploads and deletes are service-role only (Edge Function uses SUPABASE_SERVICE_ROLE_KEY)
