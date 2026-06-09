import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function POST(req: NextRequest) {
  const { account_name, text, sentiment } = await req.json()
  if (!account_name || !text) return NextResponse.json({ error: 'account_name and text required' }, { status: 400 })

  const { data: existing } = await supabase
    .from('sentiment_items')
    .select('position')
    .eq('account_name', account_name)
    .eq('sentiment', sentiment ?? 'neutral')
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const position = (existing?.position ?? -1) + 1

  const { data, error } = await supabase
    .from('sentiment_items')
    .insert({ account_name, text, sentiment: sentiment ?? 'neutral', position })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
