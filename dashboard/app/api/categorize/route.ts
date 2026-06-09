import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const CATEGORIES = [
  'BULK ACTIONS', 'PAYROLL', 'REPORTS', 'PROFILE', 'PERMISSIONS',
  'INTEGRATIONS', 'EXPENSES', 'TIME OFF', 'LETTERS', 'COMPLIANCE',
  'NOTIFICATIONS', 'PAYMENTS', 'OTHER',
]

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { title, note } = await req.json()
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const prompt = `You are a product categorization assistant for Cercli, an HR and payroll platform.

Categorize this feature request into exactly one of these categories:
${CATEGORIES.join(', ')}

Feature request: "${title}"
${note ? `Context: "${note}"` : ''}

Reply with only the category name, nothing else.`

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 20,
    messages: [{ role: 'user', content: prompt }],
  })

  const category = (msg.content[0] as { type: string; text: string }).text.trim().toUpperCase()
  const matched = CATEGORIES.find((c) => category.includes(c)) ?? 'OTHER'

  return NextResponse.json({ category: matched })
}
