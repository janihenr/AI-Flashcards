ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Users can create, read, and delete their own reviews only
CREATE POLICY "reviews_select_own" ON reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "reviews_insert_own" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews_delete_own" ON reviews
  FOR DELETE USING (auth.uid() = user_id);
-- No UPDATE policy — reviews are immutable once written
