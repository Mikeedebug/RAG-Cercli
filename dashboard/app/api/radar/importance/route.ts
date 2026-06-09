import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function PATCH(req: NextRequest) {
  const { feature_request, importance } = await req.json()
  if (!feature_request || !importance) return NextResponse.json({ error: 'feature_request and importance required' }, { status: 400 })
  if (!['high', 'mid', 'low'].includes(importance)) return NextResponse.json({ error: 'invalid importance' }, { status: 400 })

  const { error } = await supabase.from('signals').update({ importance }).eq('feature_request', feature_request)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
