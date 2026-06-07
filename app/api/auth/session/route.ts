import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (!session.isLoggedIn) {
    return NextResponse.json({ isLoggedIn: false }, { status: 401 })
  }

  return NextResponse.json({
    isLoggedIn: true,
    username: session.username,
  })
}
