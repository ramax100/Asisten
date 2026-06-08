import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Bot from '@/lib/models/Bot'

export const dynamic = 'force-dynamic'

// Check auth helper
function isAuthenticated(request: NextRequest): boolean {
  return request.cookies.get('auth-token')?.value === 'admin-authenticated'
}

// GET - List all bots
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()
    const bots = await Bot.find({}).select('-token')
    return NextResponse.json({ bots })
  } catch (error: any) {
    console.error('Get bots error:', error?.message)
    return NextResponse.json({ bots: [] })
  }
}

// POST - Add a new bot
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const token = body.token?.trim()
    // Optional: set a force-join channel and/or a group right at creation time
    const channelUsername = (body.channelUsername || '').trim()
    const groupId = (body.groupId || '').trim()

    if (!token) {
      return NextResponse.json({ error: 'Token diperlukan' }, { status: 400 })
    }

    // Verify token with Telegram API
    const telegramUrl = `https://api.telegram.org/bot${token}/getMe`
    const telegramRes = await fetch(telegramUrl)
    const telegramData = await telegramRes.json()

    if (!telegramData.ok) {
      return NextResponse.json({ 
        error: `Token tidak valid. Pastikan token benar dari BotFather. (${telegramData.description || 'Unknown error'})` 
      }, { status: 400 })
    }

    const botInfo = telegramData.result

    await connectDB()

    // Check if bot already exists
    const existingBot = await Bot.findOne({ botId: String(botInfo.id) })
    if (existingBot) {
      return NextResponse.json({ error: 'Bot sudah terdaftar' }, { status: 400 })
    }

    // Optionally validate & resolve the channel (force join)
    const channels: { channelId: string; channelUsername: string; channelTitle: string }[] = []
    if (channelUsername) {
      const cleanUsername = channelUsername.replace('@', '')
      const chatRes = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=@${cleanUsername}`)
      const chatData = await chatRes.json()
      if (!chatData.ok) {
        return NextResponse.json(
          { error: 'Channel tidak ditemukan. Pastikan bot sudah ditambahkan ke channel sebagai admin (atau kosongkan field channel).' },
          { status: 400 }
        )
      }
      const chat = chatData.result
      channels.push({
        channelId: String(chat.id),
        channelUsername: chat.username || '',
        channelTitle: chat.title,
      })
    }

    // Optionally validate & resolve the group
    const groups: { groupId: string; groupTitle: string }[] = []
    if (groupId) {
      const chatRes = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${groupId}`)
      const chatData = await chatRes.json()
      if (!chatData.ok) {
        return NextResponse.json(
          { error: 'Grup tidak ditemukan. Pastikan bot sudah ditambahkan sebagai admin di grup (atau kosongkan field grup).' },
          { status: 400 }
        )
      }
      const chat = chatData.result
      if (chat.type !== 'group' && chat.type !== 'supergroup') {
        return NextResponse.json({ error: 'ID yang dimasukkan bukan grup' }, { status: 400 })
      }
      groups.push({ groupId: String(chat.id), groupTitle: chat.title })
    }

    // Create new bot. If a channel was provided, auto-enable the force_join feature.
    const enabledFeatures = channels.length > 0 ? ['force_join'] : []
    const bot = await Bot.create({
      token,
      botId: String(botInfo.id),
      botUsername: botInfo.username,
      botName: botInfo.first_name,
      channels,
      groups,
      enabledFeatures,
    })

    return NextResponse.json({
      success: true,
      bot: {
        _id: bot._id,
        botId: bot.botId,
        botUsername: bot.botUsername,
        botName: bot.botName,
        isActive: bot.isActive,
        channels: bot.channels,
        groups: bot.groups,
      },
    })
  } catch (error: any) {
    console.error('Add bot error:', error?.message)
    return NextResponse.json({ error: 'Terjadi kesalahan: ' + (error?.message || 'unknown') }, { status: 500 })
  }
}
