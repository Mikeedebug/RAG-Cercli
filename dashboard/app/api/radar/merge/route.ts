import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

// Merges two pain points: reassigns all signals from discard_title to keep_title
export async function POST(req: NextRequest) {
  const { keep_title, discard_title, merged_category } = await req.json()
  if (!keep_title || !discard_title) return NextResponse.json({ error: 'keep_title and discard_title required' }, { status: 400 })

  // Re-point all signals from discard to keep
  const { error: sigErr } = await supabase
    .from('signals')
    .update({ feature_request: keep_title, ...(merged_category ? { category: merged_category } : {}) })
    .eq('feature_request', discard_title)

  if (sigErr) return NextResponse.json({ error: sigErr.message }, { status: 500 })

  // Update category on keep signals if provided
  if (merged_category) {
    await supabase.from('signals').update({ category: merged_category }).eq('feature_request', keep_title)
  }

  // Also migrate insight cards
  await supabase.from('insight_cards').update({ title: keep_title }).eq('title', discard_title)

  return NextResponse.json({ ok: true })
}
