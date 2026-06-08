import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Bot from '@/lib/models/Bot'
import { getBaseUrl } from '@/lib/baseUrl'

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

    const baseUrl = getBaseUrl(request)
    // Auto-fix mode: when ?autofix=1, repair the webhook silently if it's
    // missing/wrong instead of just reporting it. Set by the dashboard so
    // running diagnostic = repair without an extra click.
    const autoFix = new URL(request.url).searchParams.get('autofix') === '1'
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

    // 1b. Privacy mode - if ON, the bot does NOT receive normal group messages,
    // so Force Join / Anti-Spam / Banned Words cannot work. Must be turned OFF
    // via @BotFather (/setprivacy -> Disable).
    if (getMeData.ok) {
      const canReadAll = getMeData.result.can_read_all_group_messages === true
      results.checks.push({
        name: 'Privacy Mode',
        status: canReadAll ? 'ok' : 'error',
        detail: canReadAll
          ? 'Nonaktif (bot bisa baca semua pesan grup) ✓'
          : 'AKTIF! Bot tidak menerima pesan grup biasa. Buka @BotFather → /setprivacy → pilih bot → Disable, lalu keluarkan & masukkan kembali bot ke grup.',
      })
    }

    // 2. Check current webhook
    const webhookInfoRes = await fetch(`https://api.telegram.org/bot${bot.token}/getWebhookInfo`)
    const webhookInfoData = await webhookInfoRes.json()
    const currentWebhook = webhookInfoData.result?.url || ''
    const expectedWebhook = `${baseUrl}/api/webhook/${bot.botId}`
    let webhookMatch = currentWebhook === expectedWebhook
    let autoFixed: { ok: boolean; description?: string } | null = null

    // Auto-fix: if dashboard requested ?autofix=1 and webhook is wrong/missing,
    // call setWebhook with the right URL right here so the user doesn't need a
    // second click.
    if (autoFix && !webhookMatch && expectedWebhook) {
      try {
        const fixRes = await fetch(`https://api.telegram.org/bot${bot.token}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: expectedWebhook,
            allowed_updates: ['message', 'callback_query', 'my_chat_member', 'chat_member'],
          }),
        })
        const fixData = await fixRes.json()
        autoFixed = { ok: !!fixData.ok, description: fixData.description }
        if (fixData.ok) {
          bot.webhookUrl = expectedWebhook
          await bot.save()
          webhookMatch = true
        }
      } catch (e: any) {
        autoFixed = { ok: false, description: e?.message || 'fix failed' }
      }
    }

    results.checks.push({
      name: 'Webhook',
      status: webhookMatch ? 'ok' : currentWebhook ? 'warning' : 'error',
      detail: autoFixed?.ok
        ? `Otomatis diperbaiki ke ${expectedWebhook}`
        : autoFixed && !autoFixed.ok
        ? `Auto-fix gagal: ${autoFixed.description}`
        : webhookMatch
        ? 'Webhook aktif dan benar'
        : currentWebhook
        ? `URL tidak sesuai: ${currentWebhook}`
        : 'Webhook belum diset',
      expected: expectedWebhook,
      current: webhookMatch ? expectedWebhook : currentWebhook,
      autoFixed: autoFixed?.ok || undefined,
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

    // 5. Check channels accessible + bot must be ADMIN to verify members
    let channelOk = 0
    let channelFail = 0
    const tgBotIdForCh = getMeData.ok ? getMeData.result.id : Number(String(bot.token).split(':')[0])
    for (const channel of bot.channels) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${bot.token}/getChat?chat_id=${channel.channelId}`)
        const data = await res.json()
        if (data.ok) channelOk++
        else channelFail++

        // Verify bot is admin in the channel (needed to read member status)
        const memRes = await fetch(`https://api.telegram.org/bot${bot.token}/getChatMember?chat_id=${channel.channelId}&user_id=${tgBotIdForCh}`)
        const memData = await memRes.json()
        const isAdmin = memData.ok && (memData.result.status === 'administrator' || memData.result.status === 'creator')
        results.checks.push({
          name: `Force Join: ${channel.channelTitle}`,
          status: isAdmin ? 'ok' : 'error',
          detail: isAdmin
            ? 'Bot admin di channel - bisa cek keanggotaan ✓'
            : 'Bot BUKAN admin di channel ini. Force Join tidak bisa memverifikasi member. Jadikan bot admin di channel.',
        })
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

    // 7. Anti-spam configuration
    const antiSpamActive = bot.antiSpamEnabled === true || (bot.enabledFeatures || []).includes('anti_spam')
    results.checks.push({
      name: 'Anti-Spam Config',
      status: antiSpamActive ? 'ok' : 'error',
      detail: antiSpamActive
        ? `Aktif: mute jika ≥${bot.antiSpamLimit || 5} pesan dalam ${bot.antiSpamInterval || 10} detik (mute ${bot.antiSpamMuteDuration || '5m'})`
        : 'Anti-spam TIDAK aktif (antiSpamEnabled=false & tidak ada di enabledFeatures)',
    })

    // 7b. Warn if window is too tight to realistically reach the limit
    if (antiSpamActive && (bot.antiSpamInterval || 10) <= 2) {
      results.checks.push({
        name: 'Anti-Spam Window',
        status: 'warning',
        detail: `Interval ${bot.antiSpamInterval}s sangat ketat - sulit mengirim ${bot.antiSpamLimit || 5} pesan secepat itu. Disarankan minimal 5 detik.`,
      })
    }

    // 8. Bot must be admin WITH "Restrict members" permission in each group to mute
    const tgBotId = getMeData.ok ? getMeData.result.id : Number(String(bot.token).split(':')[0])
    for (const group of bot.groups) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${bot.token}/getChatMember?chat_id=${group.groupId}&user_id=${tgBotId}`)
        const data = await res.json()
        if (data.ok) {
          const status = data.result.status
          const canRestrict = data.result.can_restrict_members === true
          const isAdmin = status === 'administrator' || status === 'creator'
          results.checks.push({
            name: `Izin Mute: ${group.groupTitle}`,
            status: isAdmin && canRestrict ? 'ok' : 'error',
            detail: !isAdmin
              ? 'Bot BUKAN admin di grup ini'
              : canRestrict
                ? 'Bot admin & bisa restrict members'
                : 'Bot admin TAPI tidak punya izin "Restrict members" - mute akan gagal',
          })
        }
      } catch { /* ignore */ }
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

    const baseUrl = getBaseUrl(request)
    const webhookUrl = `${baseUrl}/api/webhook/${bot.botId}`

    // Set webhook
    const res = await fetch(`https://api.telegram.org/bot${bot.token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query', 'my_chat_member', 'chat_member'],
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
