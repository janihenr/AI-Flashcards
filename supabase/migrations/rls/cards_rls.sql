ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Owner has full CRUD on their cards
CREATE POLICY "cards_all_owner" ON cards
  FOR ALL USING (auth.uid() = user_id);

-- deck_shares recipients can SELECT cards (via note → deck relationship)
CREATE POLICY "cards_select_shared" ON cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM notes n
      JOIN deck_shares ds ON ds.deck_id = n.deck_id
      WHERE n.id = cards.note_id AND ds.user_id = auth.uid()
    )
  );

-- Team members can SELECT cards for assigned decks
CREATE POLICY "cards_select_team" ON cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM notes n
      JOIN team_deck_assignments tda ON tda.deck_id = n.deck_id
      WHERE n.id = cards.note_id AND tda.user_id = auth.uid()
    )
  );

-- Anonymous and authenticated users can SELECT cards for system-user-owned decks (cold start)
-- Mirrors decks_select_system_user policy — required for cold start deck to be readable.
-- Uses get_system_user_id() — same pattern as decks_select_system_user.
CREATE POLICY "cards_select_system_user" ON cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM notes n
      JOIN decks d ON d.id = n.deck_id
      WHERE n.id = cards.note_id
        AND d.user_id = get_system_user_id()
    )
  );
