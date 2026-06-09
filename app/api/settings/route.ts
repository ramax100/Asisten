import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import connectDB from '@/lib/mongodb'
import SiteSettings from '@/lib/models/SiteSettings'

export const dynamic = 'force-dynamic'

// Increase body size limit for base64 logo upload (default is 1MB)
export const maxDuration = 30

// GET: ambil settings (public — dipakai semua halaman untuk render branding)
export async function GET() {
  try {
    await connectDB()
    let settings = await SiteSettings.findOne()
    if (!settings) {
      settings = await SiteSettings.create({ brandName: 'Rich Bot', logoUrl: '' })
    }
    return NextResponse.json({ brandName: settings.brandName, logoUrl: settings.logoUrl })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ brandName: 'Rich Bot', logoUrl: '' })
  }
}

// PUT: update settings (admin only)
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const authToken = cookieStore.get('auth-token')
    if (!authToken || authToken.value !== 'admin-authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse body — handle potential large base64 payloads
    let body: any
    try {
      body = await request.json()
    } catch (parseErr) {
      console.error('Settings body parse error:', parseErr)
      return NextResponse.json({ error: 'Request body terlalu besar atau invalid' }, { status: 400 })
    }

    const { brandName, logoUrl } = body

    // Validate logo size (base64 string max ~700KB which is ~500KB image)
    if (logoUrl && logoUrl.length > 1024 * 1024) {
      return NextResponse.json({ error: 'Logo terlalu besar. Maksimal 500KB.' }, { status: 400 })
    }

    await connectDB()

    // Use findOneAndUpdate with upsert for atomic operation
    const settings = await SiteSettings.findOneAndUpdate(
      {},
      {
        $set: {
          ...(brandName !== undefined && { brandName }),
          ...(logoUrl !== undefined && { logoUrl }),
        },
      },
      { upsert: true, new: true }
    )

    return NextResponse.json({ ok: true, brandName: settings.brandName, logoUrl: settings.logoUrl })
  } catch (error: any) {
    console.error('Settings update error:', error?.message || error)
    return NextResponse.json({ error: 'Gagal menyimpan settings: ' + (error?.message || 'unknown') }, { status: 500 })
  }
}
