import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Bot from '@/lib/models/Bot'

export const dynamic = 'force-dynamic'

function isAuthenticated(request: NextRequest): boolean {
  return request.cookies.get('auth-token')?.value === 'admin-authenticated'
}

const MAX_PHOTO_BYTES = 10 * 1024 * 1024 // Telegram bot sendPhoto limit ~10MB

// POST - Send a free-form message (optionally with a photo) to one group or all groups
export async function POST(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const contentType = request.headers.get('content-type') || ''

    let target = 'all'
    let text = ''
    let photoBuffer: Buffer | null = null
    let photoName = 'photo.jpg'
    let photoType = 'image/jpeg'

    if (contentType.includes('multipart/form-data')) {
      // Photo upload (or text via form)
      const form = await request.formData()
      target = (form.get('target') as string) || 'all'
      text = (form.get('text') as string) || ''
      const file = form.get('photo')
      if (file && typeof file !== 'string') {
        const f = file as File
        if (!f.type.startsWith('image/')) {
          return NextResponse.json({ error: 'File harus berupa gambar (jpg, png, dll).' }, { status: 400 })
        }
        if (f.size > MAX_PHOTO_BYTES) {
          return NextResponse.json({ error: 'Ukuran gambar maksimal 10MB.' }, { status: 400 })
        }
        photoBuffer = Buffer.from(await f.arrayBuffer())
        photoName = f.name || 'photo.jpg'
        photoType = f.type || 'image/jpeg'
      }
    } else {
      // JSON (text only)
      const body = await request.json()
      target = body.target || 'all'
      text = body.text || ''
    }

    // Need at least a photo or some text
    if (!photoBuffer && (!text || !text.trim())) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 })
    }

    await connectDB()
    const bot = await Bot.findOne({ botId: params.botId })

    if (!bot) {
      return NextResponse.json({ error: 'Bot tidak ditemukan' }, { status: 404 })
    }

    if (!bot.groups || bot.groups.length === 0) {
      return NextResponse.json({ error: 'Belum ada grup. Tambahkan grup lewat fitur Proteksi Grup terlebih dahulu.' }, { status: 400 })
    }

    // Determine target groups: 'all' or a specific groupId
    const targets =
      target === 'all'
        ? bot.groups
        : bot.groups.filter((g: any) => g.groupId === String(target))

    if (targets.length === 0) {
      return NextResponse.json({ error: 'Grup tujuan tidak ditemukan' }, { status: 400 })
    }

    let sent = 0
    const failed: { groupId: string; reason: string }[] = []

    for (const group of targets) {
      try {
        let data: any
        if (photoBuffer) {
          // Send photo with optional caption via multipart/form-data
          const fd = new FormData()
          fd.append('chat_id', String(group.groupId))
          if (text && text.trim()) {
            fd.append('caption', text)
            fd.append('parse_mode', 'HTML')
          }
          fd.append('photo', new Blob([photoBuffer], { type: photoType }), photoName)

          const res = await fetch(`https://api.telegram.org/bot${bot.token}/sendPhoto`, {
            method: 'POST',
            body: fd,
          })
          data = await res.json()
        } else {
          // Text-only message
          const res = await fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: group.groupId, text, parse_mode: 'HTML' }),
          })
          data = await res.json()
        }

        if (data.ok) {
          sent++
        } else {
          failed.push({ groupId: group.groupId, reason: data.description || 'unknown' })
        }
      } catch (e: any) {
        failed.push({ groupId: group.groupId, reason: e?.message || 'network error' })
      }
    }

    return NextResponse.json({
      success: sent > 0,
      sent,
      total: targets.length,
      failed,
    })
  } catch (error: any) {
    console.error('Send message error:', error?.message)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
