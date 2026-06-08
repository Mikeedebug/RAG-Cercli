import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
import { fetchPylonIssues, fetchPylonIssueMessages } from '../../../lib/pylon'
import { fetchDemodeskRecordings, fetchDemodeskTranscript } from '../../../lib/demodesk'
import { extractSignals, generateInsightCards } from '../../../lib/claude'

export const maxDuration = 300

export async function POST() {
  // Create refresh log entry
  const { data: logEntry, error: logErr } = await supabase
    .from('refresh_log')
    .insert({ status: 'running' })
    .select()
    .single()

  if (logErr || !logEntry) {
    return NextResponse.json({ error: 'Failed to create refresh log' }, { status: 500 })
  }

  const logId = logEntry.id
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  let signalsAdded = 0
  let errors: string[] = []

  // Fetch existing source_ids to avoid duplicates
  const { data: existingSignals } = await supabase
    .from('signals')
    .select('source_id, source')

  const existingKeys = new Set(
    (existingSignals ?? []).map((s: { source: string; source_id: string }) => `${s.source}:${s.source_id}`)
  )

  const newSignalIds: string[] = []

  // --- Pylon ---
  if (process.env.PYLON_API_KEY) {
    try {
      const issues = await fetchPylonIssues(since)
      for (const issue of issues) {
        const key = `pylon:${issue.id}`
        if (existingKeys.has(key)) continue

        const messages = await fetchPylonIssueMessages(issue.id)
        const content = [issue.title, ...messages].join('\n\n')
        const accountName = issue.account_name ?? 'Unknown'

        let extracted = []
        try {
          extracted = await extractSignals(
            accountName,
            'support ticket',
            issue.created_at,
            content
          )
        } catch (e) {
          errors.push(`Claude extraction failed for Pylon issue ${issue.id}: ${e}`)
          continue
        }

        for (const sig of extracted) {
          const { data } = await supabase
            .from('signals')
            .insert({
              account_name: accountName,
              source: 'pylon',
              source_id: issue.id,
              feature_request: sig.feature_request,
              verbatim_quote: sig.verbatim_quote,
              signal_date: issue.created_at,
            })
            .select('id')
            .single()

          if (data?.id) {
            newSignalIds.push(data.id)
            signalsAdded++
          }
        }
        existingKeys.add(key)
      }
    } catch (e) {
      errors.push(`Pylon fetch failed: ${e}`)
    }
  }

  // --- Demodesk ---
  if (process.env.DEMODESK_API_KEY) {
    try {
      const recordings = await fetchDemodeskRecordings(since)
      for (const rec of recordings) {
        const key = `demodesk:${rec.token}`
        if (existingKeys.has(key)) continue

        const transcript = await fetchDemodeskTranscript(rec.token)
        if (!transcript) continue

        let extracted = []
        try {
          extracted = await extractSignals(
            rec.account_name,
            'sales call transcript',
            rec.start_date,
            transcript
          )
        } catch (e) {
          errors.push(`Claude extraction failed for Demodesk recording ${rec.token}: ${e}`)
          continue
        }

        for (const sig of extracted) {
          const { data } = await supabase
            .from('signals')
            .insert({
              account_name: rec.account_name,
              source: 'demodesk',
              source_id: rec.token,
              feature_request: sig.feature_request,
              verbatim_quote: sig.verbatim_quote,
              signal_date: rec.start_date,
            })
            .select('id')
            .single()

          if (data?.id) {
            newSignalIds.push(data.id)
            signalsAdded++
          }
        }
        existingKeys.add(key)
      }
    } catch (e) {
      errors.push(`Demodesk fetch failed: ${e}`)
    }
  }

  // Update signal_count and account_count on feature_requests
  const { data: allFRs } = await supabase.from('feature_requests').select('id, title')
  const { data: allSignals } = await supabase.from('signals').select('id, account_name, feature_request, signal_date')

  if (allFRs && allSignals) {
    for (const fr of allFRs) {
      const frSignals = allSignals.filter(
        (s: { feature_request: string }) =>
          s.feature_request.toLowerCase().includes(fr.title.toLowerCase().slice(0, 20))
      )
      const accounts = new Set(frSignals.map((s: { account_name: string }) => s.account_name))
      const lastSignal = frSignals.sort(
        (a: { signal_date: string }, b: { signal_date: string }) =>
          new Date(b.signal_date).getTime() - new Date(a.signal_date).getTime()
      )[0]

      await supabase
        .from('feature_requests')
        .update({
          signal_count: frSignals.length,
          account_count: accounts.size,
          last_signal_at: lastSignal?.signal_date ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fr.id)
    }
  }

  // Generate insight cards
  let insightCardsGenerated = 0
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const { data: frs } = await supabase
        .from('feature_requests')
        .select('*')
        .order('rank', { ascending: true })

      const { data: newSigs } = await supabase
        .from('signals')
        .select('*')
        .in('id', newSignalIds)

      const { data: allSigs } = await supabase
        .from('signals')
        .select('*')
        .gte('signal_date', since.toISOString())

      const cards = await generateInsightCards(frs ?? [], newSigs ?? [], allSigs ?? [])

      for (const card of cards) {
        let relatedFrId: string | null = null
        if (card.related_fr_title && frs) {
          const match = frs.find(
            (fr: { title: string }) =>
              fr.title.toLowerCase().includes(card.related_fr_title!.toLowerCase().slice(0, 15))
          )
          relatedFrId = match?.id ?? null
        }

        const { error } = await supabase.from('insight_cards').insert({
          type: card.type,
          title: card.title,
          body: card.body,
          related_fr_id: relatedFrId,
          related_account: card.related_account,
          signal_ids: newSignalIds.slice(0, 10),
          action: card.action,
          status: 'pending',
        })

        if (!error) insightCardsGenerated++
      }
    } catch (e) {
      errors.push(`Insight card generation failed: ${e}`)
    }
  }

  // Mark refresh as completed
  await supabase
    .from('refresh_log')
    .update({
      completed_at: new Date().toISOString(),
      signals_added: signalsAdded,
      insight_cards_generated: insightCardsGenerated,
      status: errors.length > 0 && signalsAdded === 0 ? 'failed' : 'completed',
      error: errors.length > 0 ? errors.join('; ') : null,
    })
    .eq('id', logId)

  return NextResponse.json({
    success: true,
    signals_added: signalsAdded,
    insight_cards_generated: insightCardsGenerated,
    errors,
  })
}
