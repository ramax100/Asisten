import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Bot from '@/lib/models/Bot'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  const authToken = request.cookies.get('auth-token')?.value
  if (authToken !== 'admin-authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()
    const bot = await Bot.findOne({ botId: params.botId })

    if (!bot) {
      return NextResponse.json({ error: 'Bot tidak ditemukan' }, { status: 404 })
    }

    // Mask token for display
    const maskedToken = bot.token
      ? `${bot.token.slice(0, 8)}...${bot.token.slice(-4)}`
      : ''

    const botData = {
      botId: bot.botId,
      botUsername: bot.botUsername,
      botName: bot.botName,
      botToken: maskedToken,
      channels: bot.channels,
      groups: bot.groups,
      isActive: bot.isActive,
      webhookUrl: bot.webhookUrl,
      forceJoinEnabled: bot.forceJoinEnabled,
      forceJoinMessage: bot.forceJoinMessage,
      successMessage: bot.successMessage,
    }

    return NextResponse.json({ bot: botData })
  } catch (error: any) {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
