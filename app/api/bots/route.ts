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
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token diperlukan' }, { status: 400 })
    }

    // Verify token with Telegram API
    const telegramRes = await fetch(`https://api.telegram.org/bot${token}/getMe`)
    const telegramData = await telegramRes.json()

    if (!telegramData.ok) {
      return NextResponse.json({ error: 'Token tidak valid' }, { status: 400 })
    }

    const botInfo = telegramData.result

    await connectDB()

    // Check if bot already exists
    const existingBot = await Bot.findOne({ botId: String(botInfo.id) })
    if (existingBot) {
      return NextResponse.json({ error: 'Bot sudah terdaftar' }, { status: 400 })
    }

    // Create new bot
    const bot = await Bot.create({
      token,
      botId: String(botInfo.id),
      botUsername: botInfo.username,
      botName: botInfo.first_name,
      channels: [],
      groups: [],
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
