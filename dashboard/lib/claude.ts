import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export type ExtractedSignal = {
  feature_request: string
  verbatim_quote: string
}

export type InsightCardDraft = {
  type: string
  title: string
  body: string
  related_fr_title: string | null
  related_account: string | null
  action: string | null
}

export async function extractSignals(
  accountName: string,
  sourceType: string,
  date: string,
  content: string
): Promise<ExtractedSignal[]> {
  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Extract feature requests from this ${sourceType} from account "${accountName}" on ${date}.

Content:
${content}

Return a JSON array of objects with fields:
- feature_request: concise description of the requested feature
- verbatim_quote: exact quote from the content supporting this request

Return only valid JSON, no other text.`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '[]'
  try {
    return JSON.parse(text)
  } catch {
    return []
  }
}

export async function generateInsightCards(
  frs: Record<string, unknown>[],
  newSignals: Record<string, unknown>[],
  allSignals: Record<string, unknown>[]
): Promise<InsightCardDraft[]> {
  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Generate advisory insight cards based on feature request signals.

Top feature requests:
${JSON.stringify(frs.slice(0, 10), null, 2)}

New signals (${newSignals.length} total):
${JSON.stringify(newSignals.slice(0, 20), null, 2)}

All recent signals summary: ${allSignals.length} signals across ${new Set(allSignals.map((s: Record<string, unknown>) => s.account_name)).size} accounts.

Return a JSON array of insight card objects with fields:
- type: one of "trend", "alert", "opportunity", "risk"
- title: short headline
- body: 1-2 sentence insight
- related_fr_title: title of related feature request or null
- related_account: account name if account-specific or null
- action: recommended action or null

Return only valid JSON, no other text.`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '[]'
  try {
    return JSON.parse(text)
  } catch {
    return []
  }
}
