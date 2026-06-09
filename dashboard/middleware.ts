import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_EMAILS = ['miquel@cercli.com', 'thomas@cercli.com']
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/customer/']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths and customer view (no login required for customers)
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next()
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) return NextResponse.next()

  const session = req.cookies.get('session')?.value
  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  try {
    const email = Buffer.from(session, 'base64').toString('utf-8')
    if (!ALLOWED_EMAILS.includes(email.toLowerCase())) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  } catch {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
