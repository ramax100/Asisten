import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authToken = request.cookies.get('auth-token')?.value

  if (authToken !== 'admin-authenticated') {
    return NextResponse.json({ isLoggedIn: false }, { status: 401 })
  }

  return NextResponse.json({
    isLoggedIn: true,
    username: 'admin',
  })
}
