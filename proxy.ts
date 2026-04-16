import { NextRequest, NextResponse } from 'next/server'

const SITE_PASSWORD = process.env.SITE_PASSWORD ?? 'studyapp'
const COOKIE_NAME = 'site_auth'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 로그인 페이지와 API는 통과
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // 쿠키 확인
  const auth = request.cookies.get(COOKIE_NAME)
  if (auth?.value === SITE_PASSWORD) {
    return NextResponse.next()
  }

  // 미인증 → 로그인 페이지로
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
}
