import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Bot from '@/lib/models/Bot'

export const dynamic = 'force-dynamic'

function isAuthenticated(request: NextRequest): boolean {
  return request.cookies.get('auth-token')?.value === 'admin-authenticated'
}

// GET - Run diagnostic check on bot
export async function GET(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()
    const bot = await Bot.findOne({ botId: params.botId })

    if (!bot) {
      return NextResponse.json({ error: 'Bot tidak ditemukan' }, { status: 404 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://asisten-seven.vercel.app'
    const results: any = {
      bot: { name: bot.botName, username: bot.botUsername, id: bot.botId },
      checks: [],
    }

    // 1. Check bot token validity
    const getMeRes = await fetch(`https://api.telegram.org/bot${bot.token}/getMe`)
    const getMeData = await getMeRes.json()
    results.checks.push({
      name: 'Token Valid',
      status: getMeData.ok ? 'ok' : 'error',
      detail: getMeData.ok ? `@${getMeData.result.username}` : getMeData.description,
    })

    // 2. Check current webhook
    const webhookInfoRes = await fetch(`https://api.telegram.org/bot${bot.token}/getWebhookInfo`)
    const webhookInfoData = await webhookInfoRes.json()
    const currentWebhook = webhookInfoData.result?.url || ''
    const expectedWebhook = `${baseUrl}/api/webhook/${bot.botId}`
    const webhookMatch = currentWebhook === expectedWebhook

    results.checks.push({
      name: 'Webhook',
      status: webhookMatch ? 'ok' : currentWebhook ? 'warning' : 'error',
      detail: webhookMatch ? 'Webhook aktif dan benar' : currentWebhook ? `URL tidak sesuai: ${currentWebhook}` : 'Webhook belum diset',
      expected: expectedWebhook,
      current: currentWebhook,
    })

    // 3. Check pending updates
    const pendingCount = webhookInfoData.result?.pending_update_count || 0
    results.checks.push({
      name: 'Pending Updates',
      status: pendingCount > 100 ? 'warning' : 'ok',
      detail: `${pendingCount} pesan tertunda`,
    })

    // 4. Check last error
    const lastError = webhookInfoData.result?.last_error_message || ''
    if (lastError) {
      results.checks.push({
        name: 'Last Error',
        status: 'warning',
        detail: lastError,
      })
    }

    // 5. Check channels accessible
    let channelOk = 0
    let channelFail = 0
    for (const channel of bot.channels) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${bot.token}/getChat?chat_id=${channel.channelId}`)
        const data = await res.json()
        if (data.ok) channelOk++
        else channelFail++
      } catch { channelFail++ }
    }
    if (bot.channels.length > 0) {
      results.checks.push({
        name: 'Channel Akses',
        status: channelFail === 0 ? 'ok' : 'warning',
        detail: `${channelOk}/${bot.channels.length} channel bisa diakses`,
      })
    }

    // 6. Check groups accessible
    let groupOk = 0
    let groupFail = 0
    for (const group of bot.groups) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${bot.token}/getChat?chat_id=${group.groupId}`)
        const data = await res.json()
        if (data.ok) groupOk++
        else groupFail++
      } catch { groupFail++ }
    }
    if (bot.groups.length > 0) {
      results.checks.push({
        name: 'Grup Akses',
        status: groupFail === 0 ? 'ok' : 'warning',
        detail: `${groupOk}/${bot.groups.length} grup bisa diakses`,
      })
    }

    return NextResponse.json(results)
  } catch (error: any) {
    return NextResponse.json({ error: 'Terjadi kesalahan: ' + (error?.message || 'unknown') }, { status: 500 })
  }
}

// POST - Auto-fix webhook
export async function POST(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()
    const bot = await Bot.findOne({ botId: params.botId })

    if (!bot) {
      return NextResponse.json({ error: 'Bot tidak ditemukan' }, { status: 404 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://asisten-seven.vercel.app'
    const webhookUrl = `${baseUrl}/api/webhook/${bot.botId}`

    // Set webhook
    const res = await fetch(`https://api.telegram.org/bot${bot.token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query', 'my_chat_member'],
      }),
    })

    const data = await res.json()

    if (data.ok) {
      bot.webhookUrl = webhookUrl
      await bot.save()
      return NextResponse.json({ success: true, message: 'Webhook berhasil diperbarui', webhookUrl })
    } else {
      return NextResponse.json({ error: `Gagal set webhook: ${data.description}` }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
