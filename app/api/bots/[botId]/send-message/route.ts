import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Bot from '@/lib/models/Bot'

export const dynamic = 'force-dynamic'

function isAuthenticated(request: NextRequest): boolean {
  return request.cookies.get('auth-token')?.value === 'admin-authenticated'
}

// POST - Send a free-form message to one group or all groups
export async function POST(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { target, text, parseMode } = await request.json()

    if (!text || !text.trim()) {
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

    // HTML by default; allow disabling formatting if requested
    const mode = parseMode === 'none' ? undefined : 'HTML'

    let sent = 0
    const failed: { groupId: string; reason: string }[] = []

    for (const group of targets) {
      try {
        const body: any = { chat_id: group.groupId, text }
        if (mode) body.parse_mode = mode

        const res = await fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
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
