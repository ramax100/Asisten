import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Bot from '@/lib/models/Bot'

export const dynamic = 'force-dynamic'

function isAuthenticated(request: NextRequest): boolean {
  return request.cookies.get('auth-token')?.value === 'admin-authenticated'
}

// PATCH - Toggle feature or update message
export async function PATCH(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { feature, enabled, message } = await request.json()

    await connectDB()
    const bot = await Bot.findOne({ botId: params.botId })

    if (!bot) {
      return NextResponse.json({ error: 'Bot tidak ditemukan' }, { status: 404 })
    }

    if (feature === 'force_join') {
      bot.forceJoinEnabled = enabled
    } else if (feature === 'force_join_message') {
      bot.forceJoinMessage = message || ''
    } else if (feature === 'success_message') {
      bot.successMessage = message || ''
    }

    await bot.save()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Toggle feature error:', error?.message)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

// DELETE - Delete feature and its data
export async function DELETE(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { feature } = await request.json()

    await connectDB()
    const bot = await Bot.findOne({ botId: params.botId })

    if (!bot) {
      return NextResponse.json({ error: 'Bot tidak ditemukan' }, { status: 404 })
    }

    if (feature === 'webhook') {
      // Delete webhook from Telegram
      if (bot.webhookUrl) {
        await fetch(`https://api.telegram.org/bot${bot.token}/deleteWebhook`)
      }
      bot.webhookUrl = ''
    } else if (feature === 'force_join') {
      bot.channels = []
      bot.forceJoinEnabled = true
      bot.forceJoinMessage = ''
      bot.successMessage = ''
    } else if (feature === 'protect_group') {
      bot.groups = []
    }

    await bot.save()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete feature error:', error?.message)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
