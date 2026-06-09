import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { account_name, feature_request, verbatim_quote, source } = body as {
    account_name: string
    feature_request: string
    verbatim_quote?: string
    source?: string
  }

  if (!account_name || !feature_request) {
    return NextResponse.json({ error: 'account_name and feature_request are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('signals')
    .insert({
      account_name,
      feature_request,
      verbatim_quote: verbatim_quote ?? null,
      source: source ?? 'manual',
      source_id: `manual-${crypto.randomUUID()}`,
      signal_date: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { account_name, feature_request, source } = await req.json()
  if (!account_name || !feature_request || !source) {
    return NextResponse.json({ error: 'account_name, feature_request and source required' }, { status: 400 })
  }
  const allowed = ['demodesk', 'pylon', 'nps']
  if (!allowed.includes(source)) {
    return NextResponse.json({ error: 'invalid source' }, { status: 400 })
  }

  const { error } = await supabase
    .from('signals')
    .update({ source })
    .eq('account_name', account_name)
    .eq('feature_request', feature_request)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
