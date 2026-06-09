import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function PATCH(req: NextRequest) {
  const { feature_request, category } = await req.json()
  if (!feature_request || !category) return NextResponse.json({ error: 'feature_request and category required' }, { status: 400 })

  const { error } = await supabase.from('signals').update({ category }).eq('feature_request', feature_request)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
