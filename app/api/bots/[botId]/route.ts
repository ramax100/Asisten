import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Bot from '@/lib/models/Bot'
import Counter from '@/lib/models/Counter'
import GreetingDedup from '@/lib/models/GreetingDedup'

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
      welcomeMessage: bot.welcomeMessage,
      greeting_pagi: bot.greetingPagi,
      greeting_siang: bot.greetingSiang,
      greeting_sore: bot.greetingSore,
      greeting_malam: bot.greetingMalam,
      greetingTemplatesPagi: bot.greetingTemplatesPagi || [],
      greetingTemplatesSiang: bot.greetingTemplatesSiang || [],
      greetingTemplatesSore: bot.greetingTemplatesSore || [],
      greetingTemplatesMalam: bot.greetingTemplatesMalam || [],
      bannedWords: bot.bannedWords || [],
      bannedWordsAction: bot.bannedWordsAction || 'delete_warn',
      bannedWordsMessage: bot.bannedWordsMessage || '',
      antiSpamLimit: bot.antiSpamLimit || 5,
      antiSpamInterval: bot.antiSpamInterval || 10,
      antiSpamMuteDuration: bot.antiSpamMuteDuration || '5m',
      antiSpamMessage: bot.antiSpamMessage || '',
      antiSpamEnabled: bot.antiSpamEnabled || false,
      antiForwardWarningLimit: bot.antiForwardWarningLimit || 3,
      antiForwardMuteDuration: bot.antiForwardMuteDuration || '1h',
      antiForwardWarningMessage: bot.antiForwardWarningMessage || '',
      antiForwardMuteMessage: bot.antiForwardMuteMessage || '',
      moderationMuteMessage: bot.moderationMuteMessage || '',
      moderationUnmuteMessage: bot.moderationUnmuteMessage || '',
      moderationKickMessage: bot.moderationKickMessage || '',
      moderationBanMessage: bot.moderationBanMessage || '',
      moderationUnbanMessage: bot.moderationUnbanMessage || '',
      enabledFeatures: bot.enabledFeatures || [],
    }

    return NextResponse.json({ bot: botData })
  } catch (error: any) {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}


// PATCH - Update bot token (in case token changes from BotFather)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  const authToken = request.cookies.get('auth-token')?.value
  if (authToken !== 'admin-authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const newToken = body.token?.trim()

    if (!newToken) {
      return NextResponse.json({ error: 'Token baru diperlukan' }, { status: 400 })
    }

    // Verify new token with Telegram API
    const telegramRes = await fetch(`https://api.telegram.org/bot${newToken}/getMe`)
    const telegramData = await telegramRes.json()

    if (!telegramData.ok) {
      return NextResponse.json({
        error: `Token tidak valid: ${telegramData.description || 'Unknown error'}`
      }, { status: 400 })
    }

    const newBotInfo = telegramData.result

    await connectDB()
    const bot = await Bot.findOne({ botId: params.botId })

    if (!bot) {
      return NextResponse.json({ error: 'Bot tidak ditemukan' }, { status: 404 })
    }

    // Verify the new token belongs to the same bot (bot ID must match)
    if (String(newBotInfo.id) !== bot.botId) {
      return NextResponse.json({
        error: `Token ini milik bot lain (@${newBotInfo.username}). Token harus milik bot yang sama.`
      }, { status: 400 })
    }

    // Update token + bot info
    bot.token = newToken
    bot.botUsername = newBotInfo.username
    bot.botName = newBotInfo.first_name
    await bot.save()

    // Re-set webhook with new token if webhook was active
    if (bot.webhookUrl) {
      try {
        await fetch(`https://api.telegram.org/bot${newToken}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: bot.webhookUrl,
            allowed_updates: ['message', 'callback_query', 'my_chat_member'],
          }),
        })
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: 'Token berhasil diperbarui',
      bot: {
        botId: bot.botId,
        botName: bot.botName,
        botUsername: bot.botUsername,
      },
    })
  } catch (error: any) {
    console.error('Update token error:', error?.message)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

// DELETE - Remove a bot entirely (delete webhook on Telegram, then delete data)
export async function DELETE(
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

    // Best-effort: remove the webhook on Telegram so the bot stops receiving updates
    if (bot.token) {
      try {
        await fetch(`https://api.telegram.org/bot${bot.token}/deleteWebhook`)
      } catch { /* ignore network errors */ }
    }

    // Delete the bot document
    await Bot.deleteOne({ botId: params.botId })

    // Best-effort cleanup of related transient data (counters & greeting dedup)
    try {
      await Counter.deleteMany({ key: new RegExp(`(^|_)${params.botId}(_|$)`) })
      await GreetingDedup.deleteMany({ key: new RegExp(`(^|_)${params.botId}(_|$)`) })
    } catch { /* these auto-expire anyway */ }

    return NextResponse.json({ success: true, message: 'Bot berhasil dihapus' })
  } catch (error: any) {
    console.error('Delete bot error:', error?.message)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
