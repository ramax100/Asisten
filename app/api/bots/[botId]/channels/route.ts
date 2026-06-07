import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Bot from '@/lib/models/Bot'

export const dynamic = 'force-dynamic'

function isAuthenticated(request: NextRequest): boolean {
  return request.cookies.get('auth-token')?.value === 'admin-authenticated'
}

// POST - Add channel to force join list
export async function POST(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { channelUsername } = await request.json()

    if (!channelUsername) {
      return NextResponse.json({ error: 'Username channel diperlukan' }, { status: 400 })
    }

    await connectDB()
    const bot = await Bot.findOne({ botId: params.botId })

    if (!bot) {
      return NextResponse.json({ error: 'Bot tidak ditemukan' }, { status: 404 })
    }

    // Clean username
    const cleanUsername = channelUsername.replace('@', '')

    // Verify channel exists and bot is member using bot's token
    const chatRes = await fetch(
      `https://api.telegram.org/bot${bot.token}/getChat?chat_id=@${cleanUsername}`
    )
    const chatData = await chatRes.json()

    if (!chatData.ok) {
      return NextResponse.json(
        { error: 'Channel tidak ditemukan. Pastikan bot sudah ditambahkan ke channel sebagai admin.' },
        { status: 400 }
      )
    }

    const chat = chatData.result

    // Check if channel already added
    const exists = bot.channels.find((c: any) => c.channelId === String(chat.id))
    if (exists) {
      return NextResponse.json({ error: 'Channel sudah ditambahkan' }, { status: 400 })
    }

    // Add channel
    bot.channels.push({
      channelId: String(chat.id),
      channelUsername: chat.username || '',
      channelTitle: chat.title,
    })

    await bot.save()

    return NextResponse.json({ success: true, channel: bot.channels[bot.channels.length - 1] })
  } catch (error: any) {
    console.error('Add channel error:', error?.message)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

// DELETE - Remove channel from force join list
export async function DELETE(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { channelId } = await request.json()

    await connectDB()
    const bot = await Bot.findOne({ botId: params.botId })

    if (!bot) {
      return NextResponse.json({ error: 'Bot tidak ditemukan' }, { status: 404 })
    }

    bot.channels = bot.channels.filter((c: any) => c.channelId !== channelId)
    await bot.save()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Remove channel error:', error?.message)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
