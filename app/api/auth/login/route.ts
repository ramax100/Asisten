import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'

// Admin credentials
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '@Admin001002'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password diperlukan' }, { status: 400 })
    }

    // Verify admin credentials
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
    }

    // Create session
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    session.isLoggedIn = true
    session.username = username
    await session.save()

    return NextResponse.json({
      success: true,
      message: 'Login berhasil',
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
