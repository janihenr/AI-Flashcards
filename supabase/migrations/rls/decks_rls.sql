ALTER TABLE decks ENABLE ROW LEVEL SECURITY;

-- Owner has full CRUD on their decks
CREATE POLICY "decks_all_owner" ON decks
  FOR ALL USING (auth.uid() = user_id);

-- deck_shares recipients can SELECT the deck
CREATE POLICY "decks_select_shared" ON decks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM deck_shares WHERE deck_id = id AND user_id = auth.uid())
  );

-- Anonymous and authenticated users can SELECT system-user-owned decks (cold start deck)
-- Uses get_system_user_id() — a SECURITY DEFINER function that bypasses RLS and is STABLE
-- (cached once per transaction). Works with Supabase Pooler transaction mode.
CREATE POLICY "decks_select_system_user" ON decks
  FOR SELECT USING (user_id = get_system_user_id());

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Owner has full CRUD on notes in their decks
CREATE POLICY "notes_all_owner" ON notes
  FOR ALL USING (auth.uid() = user_id);

-- deck_shares recipients can SELECT notes
CREATE POLICY "notes_select_shared" ON notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM deck_shares WHERE deck_id = notes.deck_id AND user_id = auth.uid())
  );

ALTER TABLE deck_shares ENABLE ROW LEVEL SECURITY;

-- Deck owner can manage shares
CREATE POLICY "deck_shares_all_owner" ON deck_shares
  FOR ALL USING (
    EXISTS (SELECT 1 FROM decks WHERE id = deck_id AND user_id = auth.uid())
  );

-- Recipients can see their own share records
CREATE POLICY "deck_shares_select_recipient" ON deck_shares
  FOR SELECT USING (auth.uid() = user_id);
