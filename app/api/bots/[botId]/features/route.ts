import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Bot from '@/lib/models/Bot'

export const dynamic = 'force-dynamic'

function isAuthenticated(request: NextRequest): boolean {
  return request.cookies.get('auth-token')?.value === 'admin-authenticated'
}

// PATCH - Toggle feature, enable feature, or update message
export async function PATCH(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { feature, enabled, message, featureId } = await request.json()

    await connectDB()
    const bot = await Bot.findOne({ botId: params.botId })

    if (!bot) {
      return NextResponse.json({ error: 'Bot tidak ditemukan' }, { status: 404 })
    }

    if (feature === 'enable_feature') {
      // Add feature to enabledFeatures list
      if (!bot.enabledFeatures.includes(featureId)) {
        bot.enabledFeatures.push(featureId)
      }
    } else if (feature === 'force_join') {
      bot.forceJoinEnabled = enabled
    } else if (feature === 'force_join_message') {
      bot.forceJoinMessage = message || ''
    } else if (feature === 'success_message') {
      bot.successMessage = message || ''
    } else if (feature === 'welcome_message') {
      bot.welcomeMessage = message || ''
    } else if (feature === 'greeting_pagi') {
      bot.greetingPagi = message || ''
    } else if (feature === 'greeting_siang') {
      bot.greetingSiang = message || ''
    } else if (feature === 'greeting_sore') {
      bot.greetingSore = message || ''
    } else if (feature === 'greeting_malam') {
      bot.greetingMalam = message || ''
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

    // Remove from enabledFeatures
    bot.enabledFeatures = bot.enabledFeatures.filter((f: string) => f !== feature)

    // Clear feature data
    if (feature === 'webhook') {
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
    } else if (feature === 'welcome') {
      bot.welcomeMessage = ''
    } else if (feature === 'greeting') {
      bot.greetingPagi = ''
      bot.greetingSiang = ''
      bot.greetingSore = ''
      bot.greetingMalam = ''
    }

    await bot.save()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete feature error:', error?.message)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
