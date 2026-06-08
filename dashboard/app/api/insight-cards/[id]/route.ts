import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { action, snoozed_until } = body

  if (!['approved', 'dismissed', 'snoozed'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  if (action === 'approved') {
    // Fetch the insight card
    const { data: card, error: fetchErr } = await supabase
      .from('insight_cards')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    // 1. Create the signal
    const { data: signal } = await supabase
      .from('signals')
      .insert({
        account_name: card.related_account,
        source: card.source ?? 'pylon',
        source_id: card.source_id ?? id,
        feature_request: card.title,
        verbatim_quote: card.body,
        signal_date: card.signal_date ?? new Date().toISOString(),
      })
      .select('id')
      .single()

    // 2. Create a new feature request
    const { data: fr } = await supabase
      .from('feature_requests')
      .insert({
        title: card.title,
        description: card.body ? `"${card.body}" — ${card.related_account}` : null,
        status: 'under_review',
        signal_count: 1,
        account_count: 1,
        last_signal_at: card.signal_date ?? new Date().toISOString(),
      })
      .select('id')
      .single()

    // 3. Mark the insight card as approved and link it
    const { data: updated, error } = await supabase
      .from('insight_cards')
      .update({
        status: 'approved',
        related_fr_id: fr?.id ?? null,
        signal_ids: signal?.id ? [signal.id] : [],
        acted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(updated)
  }

  // dismissed or snoozed
  const { data, error } = await supabase
    .from('insight_cards')
    .update({
      status: action,
      snoozed_until: action === 'snoozed' ? snoozed_until : null,
      acted_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
