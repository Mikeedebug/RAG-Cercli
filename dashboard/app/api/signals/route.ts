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
