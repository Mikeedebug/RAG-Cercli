import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { keep_id, discard_id, merged_body } = body as {
    keep_id: string
    discard_id: string
    merged_body?: string
  }

  if (!keep_id || !discard_id) {
    return NextResponse.json({ error: 'keep_id and discard_id are required' }, { status: 400 })
  }

  // Optionally update the body of the keep card
  let updatedCard
  if (merged_body !== undefined) {
    const { data, error } = await supabase
      .from('insight_cards')
      .update({ body: merged_body })
      .eq('id', keep_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    updatedCard = data
  } else {
    const { data, error } = await supabase
      .from('insight_cards')
      .select()
      .eq('id', keep_id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    updatedCard = data
  }

  // Delete the discard card
  const { error: deleteError } = await supabase
    .from('insight_cards')
    .delete()
    .eq('id', discard_id)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  return NextResponse.json(updatedCard)
}
