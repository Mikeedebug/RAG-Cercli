import Anthropic from '@anthropic-ai/sdk'
import type { FeatureRequest, Signal } from './supabase'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-20250514'

export type ExtractedSignal = {
  feature_request: string
  verbatim_quote: string
}

export type RawInsightCard = {
  type: 'new_signal' | 'cluster_forming' | 'rank_suggestion' | 'status_update'
  title: string
  body: string
  related_fr_title: string | null
  related_account: string | null
  action: string
}

export async function extractSignalsBatch(
  accountName: string,
  sourceType: string,
  content: string
): Promise<ExtractedSignal[]> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system:
      'You are analyzing customer support tickets and sales calls for a B2B HR tech platform (HRIS, payroll, ATS, EOR) serving companies in the Middle East. Extract feature requests and product gaps.',
    messages: [
      {
        role: 'user',
        content: `Account: ${accountName}\nSource: ${sourceType}\n\nContent:\n${content.slice(0, 8000)}\n\nExtract all feature requests or product gaps. Return a JSON array:\n[\n  {\n    "feature_request": "concise title (max 10 words)",\n    "verbatim_quote": "exact words from the content"\n  }\n]\n\nReturn empty array [] if no clear feature requests. Return ONLY valid JSON.`,
      },
    ],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '[]'
  try {
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function generateInsightCards(
  featureRequests: FeatureRequest[],
  newSignals: Signal[],
  allSignals: Signal[]
): Promise<RawInsightCard[]> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system:
      'You are a product advisor for a B2B HR tech startup. Generate concise advisory cards for the product lead. You suggest — never decide.',
    messages: [
      {
        role: 'user',
        content: `TOP FEATURE REQUESTS:\n${JSON.stringify(featureRequests.slice(0, 10), null, 2)}\n\nNEW SIGNALS THIS REFRESH:\n${JSON.stringify(newSignals.slice(0, 50), null, 2)}\n\nALL SIGNALS SUMMARY: ${allSignals.length} signals across ${new Set(allSignals.map((s) => s.account_name)).size} accounts.\n\nGenerate up to 8 insight cards. For each:\n[\n  {\n    "type": "new_signal | cluster_forming | rank_suggestion | status_update",\n    "title": "short headline (max 8 words)",\n    "body": "2-3 sentence advisory. Be specific. Name accounts.",\n    "related_fr_title": "title of related FR or null",\n    "related_account": "account name or null",\n    "action": "one specific suggested action"\n  }\n]\n\nReturn ONLY valid JSON.`,
      },
    ],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '[]'
  try {
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
