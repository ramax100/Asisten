import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'
import connectDB from '@/lib/mongodb'
import Bot from '@/lib/models/Bot'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token diperlukan' }, { status: 400 })
    }

    // Verify token with Telegram API
    const telegramRes = await fetch(`https://api.telegram.org/bot${token}/getMe`)
    const telegramData = await telegramRes.json()

    if (!telegramData.ok) {
      return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 })
    }

    const botInfo = telegramData.result

    // Connect to database and save/update bot
    await connectDB()

    let bot = await Bot.findOne({ botId: String(botInfo.id) })

    if (!bot) {
      bot = await Bot.create({
        token,
        botId: String(botInfo.id),
        botUsername: botInfo.username,
        botName: botInfo.first_name,
        ownerId: String(botInfo.id), // Will be updated when we know the owner
        channels: [],
        groups: [],
      })
    } else {
      // Update token if changed
      bot.token = token
      bot.botUsername = botInfo.username
      bot.botName = botInfo.first_name
      await bot.save()
    }

    // Create session
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
    session.botId = String(botInfo.id)
    session.botToken = token
    session.botUsername = botInfo.username
    session.isLoggedIn = true
    await session.save()

    return NextResponse.json({
      success: true,
      bot: {
        id: botInfo.id,
        username: botInfo.username,
        name: botInfo.first_name,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
