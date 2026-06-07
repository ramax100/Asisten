import { NextRequest, NextResponse } from 'next/server'

// Admin credentials
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '@Admin001002'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password diperlukan' }, { status: 400 })
    }

    // Verify admin credentials
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
    }

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Login berhasil',
    })

    // Set simple auth cookie
    response.cookies.set('auth-token', 'admin-authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('Login error:', error?.message || error)
    return NextResponse.json({ error: 'Terjadi kesalahan server: ' + (error?.message || 'unknown') }, { status: 500 })
  }
}
