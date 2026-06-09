import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const accountName = decodeURIComponent(name)

  const [accountRes, signalsRes, insightCardsRes, allFRsRes, metaRes] = await Promise.all([
    supabase.from('accounts').select('name, tier, acv, pylon_id').eq('name', accountName).single(),
    supabase.from('signals').select('*').eq('account_name', accountName).order('signal_date', { ascending: false }),
    supabase.from('insight_cards').select('*').eq('related_account', accountName).eq('status', 'pending'),
    supabase.from('feature_requests').select('id, title, status'),
    supabase.from('account_fr_meta').select('*').eq('account_name', accountName),
  ])

  const signals = signalsRes.data ?? []
  const allFRs: { id: string; title: string; status: string }[] = allFRsRes.data ?? []
  const metaList: { feature_request_title: string; priority: string | null; estimated_release: string | null; comments: string | null }[] = metaRes.data ?? []

  const frByTitle: Record<string, { id: string; status: string }> = {}
  for (const fr of allFRs) frByTitle[fr.title.toLowerCase()] = { id: fr.id, status: fr.status }

  const metaByTitle: Record<string, { priority: string | null; estimated_release: string | null; comments: string | null }> = {}
  for (const m of metaList) metaByTitle[m.feature_request_title.toLowerCase()] = m

  const seen = new Set<string>()
  const featureRequests: {
    id: string; title: string; status: string; source: string; source_id: string; signal_date: string | null;
    priority: string | null; estimated_release: string | null; comments: string | null; category?: string
  }[] = []

  for (const sig of signals) {
    const key = sig.feature_request.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const fr = frByTitle[key]
    const meta = metaByTitle[key]
    featureRequests.push({
      id: fr?.id ?? '',
      title: sig.feature_request,
      status: fr?.status ?? 'pending',
      source: sig.source,
      source_id: sig.source_id ?? '',
      signal_date: sig.signal_date ?? null,
      priority: meta?.priority ?? null,
      estimated_release: meta?.estimated_release ?? null,
      comments: meta?.comments ?? null,
      category: sig.category ?? undefined,
    })
  }

  const acc = accountRes.data
  const account = acc
    ? { name: acc.name, tier: acc.tier ?? null, acv: acc.acv ?? null, pylon_id: acc.pylon_id ?? null }
    : { name: accountName, tier: null, acv: null, pylon_id: null }

  const insightCards = (insightCardsRes.data ?? []).map((c) => ({
    id: c.id, title: c.title, body: c.body,
    source: c.source ?? null, source_id: c.source_id ?? null,
    signal_date: c.signal_date ?? null, status: c.status,
  }))

  return NextResponse.json({ account, feature_requests: featureRequests, insight_cards: insightCards })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const accountName = decodeURIComponent(name)
  const body = await req.json()
  const { feature_request, note } = body as { feature_request: string; note?: string }

  if (!feature_request) return NextResponse.json({ error: 'feature_request is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('signals')
    .insert({
      account_name: accountName,
      feature_request,
      verbatim_quote: note ?? null,
      source: 'manual',
      source_id: `manual-${crypto.randomUUID()}`,
      signal_date: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
