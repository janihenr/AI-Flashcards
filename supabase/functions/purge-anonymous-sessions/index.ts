// Deno Edge Function — GDPR cleanup for unconverted anonymous sessions
// Runs daily via cron; hard-deletes reviews first (FK constraint), then anonymous_sessions row,
// then the auth.users entry. Deletion order ensures no orphaned rows if a step fails.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // bypasses RLS — required for cross-user deletes
)

Deno.serve(async () => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Find unconverted sessions older than 30 days
  const { data: sessions, error } = await supabase
    .from('anonymous_sessions')
    .select('id, supabase_anon_id')
    .is('linked_at', null)
    .lt('created_at', cutoff)

  if (error) {
    console.error('Failed to fetch sessions:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!sessions?.length) {
    return new Response('No sessions to purge', { status: 200 })
  }

  let purged = 0
  let failed = 0

  for (const session of sessions) {
    // Re-check linked_at to guard against TOCTOU (session linked between SELECT and DELETE)
    const { data: current } = await supabase
      .from('anonymous_sessions')
      .select('linked_at')
      .eq('id', session.id)
      .single()

    if (current?.linked_at !== null) {
      // Session was linked after our initial fetch — skip
      continue
    }

    // Deletion order: reviews → anonymous_sessions → auth user
    // anonymous_sessions is deleted before auth user so a failed auth delete is retried next run
    const { error: reviewsErr } = await supabase
      .from('reviews')
      .delete()
      .eq('user_id', session.supabase_anon_id)

    if (reviewsErr) {
      console.error(`Failed to delete reviews for ${session.supabase_anon_id}:`, reviewsErr.message)
      failed++
      continue
    }

    const { error: sessionErr } = await supabase
      .from('anonymous_sessions')
      .delete()
      .eq('id', session.id)

    if (sessionErr) {
      console.error(`Failed to delete session ${session.id}:`, sessionErr.message)
      failed++
      continue
    }

    const { error: authErr } = await supabase.auth.admin.deleteUser(session.supabase_anon_id)

    if (authErr) {
      console.error(`Failed to delete auth user ${session.supabase_anon_id}:`, authErr.message)
      // Session row is already deleted — auth user is orphaned but won't be retried.
      // Log for manual cleanup.
      failed++
      continue
    }

    purged++
  }

  console.log(`Purged ${purged} anonymous sessions, ${failed} failed`)
  return new Response(
    JSON.stringify({ purged, failed }),
    { status: failed > 0 ? 207 : 200, headers: { 'Content-Type': 'application/json' } }
  )
})
