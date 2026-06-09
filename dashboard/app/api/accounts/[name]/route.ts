import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const accountName = decodeURIComponent(name)

  const [accountRes, signalsRes, insightCardsRes, allFRsRes, metaRes, sentimentRes] = await Promise.all([
    supabase.from('accounts').select('name, tier, acv, pylon_id').eq('name', accountName).single(),
    supabase.from('signals').select('*').eq('account_name', accountName).order('signal_date', { ascending: false }),
    supabase.from('insight_cards').select('*').eq('related_account', accountName).eq('status', 'pending'),
    supabase.from('feature_requests').select('id, title, status'),
    supabase.from('account_fr_meta').select('*').eq('account_name', accountName).eq('is_active', true),
    supabase.from('sentiment_items').select('*').eq('account_name', accountName).order('position'),
  ])

  const signals = signalsRes.data ?? []
  const allFRs: { id: string; title: string; status: string }[] = allFRsRes.data ?? []
  const metaList = metaRes.data ?? []

  const frByTitle: Record<string, { id: string; status: string }> = {}
  for (const fr of allFRs) frByTitle[fr.title.toLowerCase()] = { id: fr.id, status: fr.status }

  const signalByFR: Record<string, typeof signals[0]> = {}
  for (const sig of signals) {
    const key = sig.feature_request.toLowerCase()
    if (!signalByFR[key]) signalByFR[key] = sig
  }

  // Compute cross-account counts for auto-rank
  const frTitles = metaList.map((m) => m.feature_request_title)
  const crossCountByFR: Record<string, number> = {}
  if (frTitles.length > 0) {
    const crossRes = await supabase.from('signals').select('feature_request, account_name').in('feature_request', frTitles)
    const accountSets: Record<string, Set<string>> = {}
    for (const s of crossRes.data ?? []) {
      const key = s.feature_request.toLowerCase()
      if (!accountSets[key]) accountSets[key] = new Set()
      accountSets[key].add(s.account_name)
    }
    for (const [k, v] of Object.entries(accountSets)) crossCountByFR[k] = v.size
  }

  const acc = accountRes.data
  const tier = acc?.tier ?? null
  const tierScore = tier === 'A' ? 4 : tier === 'B' ? 3 : 1

  const now = new Date()
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

  const featureRequests = metaList.map((meta) => {
    const key = meta.feature_request_title.toLowerCase()
    const sig = signalByFR[key]
    const fr = frByTitle[key]

    const signalDate = meta.fr_date ?? sig?.signal_date ?? null

    let rank = meta.rank ?? null
    if (rank === null) {
      const crossCount = crossCountByFR[key] ?? 1
      const crossScore = crossCount > 1 ? 2 : 0
      const recencyScore = signalDate && new Date(signalDate) > monthAgo ? 2 : 1
      const priority = meta.priority ?? null
      const priorityScore = priority === 'High' ? 2 : priority === 'Medium' ? 1 : 0
      rank = Math.min(tierScore + crossScore + recencyScore + priorityScore, 10)
    }

    return {
      id: fr?.id ?? '',
      title: meta.feature_request_title,
      status: fr?.status ?? 'pending',
      source: sig?.source ?? 'manual',
      source_id: sig?.source_id ?? '',
      signal_date: signalDate,
      priority: meta.priority ?? null,
      estimated_release: meta.estimated_release ?? null,
      comments: meta.comments ?? null,
      category: sig?.category ?? undefined,
      reporter: meta.reporter ?? null,
      rank,
    }
  })

  const account = acc
    ? { name: acc.name, tier: acc.tier ?? null, acv: acc.acv ?? null, pylon_id: acc.pylon_id ?? null }
    : { name: accountName, tier: null, acv: null, pylon_id: null }

  const insightCards = (insightCardsRes.data ?? []).map((c) => ({
    id: c.id, title: c.title, body: c.body,
    source: c.source ?? null, source_id: c.source_id ?? null,
    signal_date: c.signal_date ?? null, status: c.status,
  }))

  return NextResponse.json({
    account,
    feature_requests: featureRequests,
    insight_cards: insightCards,
    sentiment_items: sentimentRes.data ?? [],
  })
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

  // Mark as active in fr_meta so it appears on the left panel
  await supabase.from('account_fr_meta').upsert(
    { account_name: accountName, feature_request_title: feature_request, is_active: true },
    { onConflict: 'account_name,feature_request_title' }
  )

  return NextResponse.json(data, { status: 201 })
}
