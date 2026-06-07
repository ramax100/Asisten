import { NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

    if (!session.isLoggedIn) {
      return NextResponse.json({ isLoggedIn: false }, { status: 401 })
    }

    return NextResponse.json({
      isLoggedIn: true,
      username: session.username,
    })
  } catch (error) {
    return NextResponse.json({ isLoggedIn: false }, { status: 401 })
  }
}
