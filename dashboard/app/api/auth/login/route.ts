import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_EMAILS = ['miquel@cercli.com', 'thomas@cercli.com']

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email || !ALLOWED_EMAILS.includes(email.toLowerCase())) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  const session = Buffer.from(email.toLowerCase()).toString('base64')
  const res = NextResponse.json({ ok: true })
  res.cookies.set('session', session, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })
  return res
}
