import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
import { fetchPylonIssues } from '../../../lib/pylon'
import { fetchDemodeskRecordings, fetchDemodeskTranscript } from '../../../lib/demodesk'
import { extractSignalsBatch } from '../../../lib/claude'

export const maxDuration = 300

export async function POST() {
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
  let insightsQueued = 0
  const errors: string[] = []

  // Load already-queued insight cards to avoid duplicates (source_id + title)
  const { data: existingCards } = await supabase
    .from('insight_cards')
    .select('source_id, title')
  const existingKeys = new Set(
    (existingCards ?? []).map(
      (c: { source_id: string; title: string }) => `${c.source_id}:${c.title}`
    )
  )

  // --- Pylon: batch all issues per account, one Claude call per account ---
  if (process.env.PYLON_API_KEY) {
    try {
      const issues = await fetchPylonIssues(since)

      const byAccount: Record<string, typeof issues> = {}
      for (const issue of issues) {
        if (!byAccount[issue.account_name]) byAccount[issue.account_name] = []
        byAccount[issue.account_name].push(issue)
      }

      for (const [accountName, accountIssues] of Object.entries(byAccount)) {
        const content = accountIssues
          .map((i) => `[${new Date(i.created_at).toLocaleDateString()}] ${i.title}`)
          .join('\n')

        try {
          const extracted = await extractSignalsBatch(accountName, 'support tickets', content)
          for (const sig of extracted) {
            const sourceIssue = accountIssues[0]
            const key = `${sourceIssue.id}:${sig.feature_request}`
            if (existingKeys.has(key)) continue

            const { error } = await supabase.from('insight_cards').insert({
              type: 'new_signal',
              title: sig.feature_request,
              body: sig.verbatim_quote ?? '',
              related_account: accountName,
              source: 'pylon',
              source_id: sourceIssue.id,
              signal_date: sourceIssue.created_at,
              status: 'pending',
            })
            if (!error) {
              insightsQueued++
              existingKeys.add(key)
            }
          }
        } catch (e) {
          errors.push(`Claude failed for ${accountName}: ${e}`)
        }
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
        const transcript = await fetchDemodeskTranscript(rec.token)
        if (!transcript) continue

        try {
          const extracted = await extractSignalsBatch(
            rec.account_name,
            'sales call transcript',
            transcript
          )
          for (const sig of extracted) {
            const key = `${rec.token}:${sig.feature_request}`
            if (existingKeys.has(key)) continue

            const { error } = await supabase.from('insight_cards').insert({
              type: 'new_signal',
              title: sig.feature_request,
              body: sig.verbatim_quote ?? '',
              related_account: rec.account_name,
              source: 'demodesk',
              source_id: rec.token,
              signal_date: rec.start_date,
              status: 'pending',
            })
            if (!error) {
              insightsQueued++
              existingKeys.add(key)
            }
          }
        } catch (e) {
          errors.push(`Claude failed for Demodesk ${rec.token}: ${e}`)
        }
      }
    } catch (e) {
      errors.push(`Demodesk fetch failed: ${e}`)
    }
  }

  await supabase
    .from('refresh_log')
    .update({
      completed_at: new Date().toISOString(),
      signals_added: insightsQueued,
      insight_cards_generated: insightsQueued,
      status: errors.length > 0 && insightsQueued === 0 ? 'failed' : 'completed',
      error: errors.length > 0 ? errors.join('; ') : null,
    })
    .eq('id', logId)

  return NextResponse.json({ success: true, insights_queued: insightsQueued, errors })
}

export async function GET() {
  const { data } = await supabase
    .from('refresh_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(3)
  return NextResponse.json(data ?? [])
}
