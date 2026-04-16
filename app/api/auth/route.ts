import { NextRequest, NextResponse } from 'next/server'

const SITE_PASSWORD = process.env.SITE_PASSWORD ?? 'studyapp'
const COOKIE_NAME = 'site_auth'

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  if (password !== SITE_PASSWORD) {
    return NextResponse.json({ error: '비밀번호가 틀렸습니다' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, SITE_PASSWORD, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30일
    path: '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('site_auth')
  return res
}
