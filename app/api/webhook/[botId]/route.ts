import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Bot from '@/lib/models/Bot'
import Counter from '@/lib/models/Counter'
import GreetingDedup from '@/lib/models/GreetingDedup'
import { getGreetingSlot, getWibDateKey, resolveGreetingText, greetingDedupKey } from '@/lib/greetings'
import { handleCommand } from './handleCommand'

export const dynamic = 'force-dynamic'

// Opportunistic greeting: fire the current time-slot greeting on the first
// group activity of that slot. Makes all 4 slots (pagi/siang/sore/malam) work
// automatically without depending on an hourly external cron. Dedup shares the
// same key with the cron, so a slot is sent at most once per group per day.
async function maybeSendGreeting(message: any, bot: any) {
  try {
    const chat = message?.chat
    if (!chat || (chat.type !== 'group' && chat.type !== 'supergroup')) return
    if (!bot.enabledFeatures || !bot.enabledFeatures.includes('greeting')) return

    const slot = getGreetingSlot()
    const text = resolveGreetingText(bot, slot)
    if (text === null) return // slot disabled

    const key = greetingDedupKey(chat.id, slot, getWibDateKey())
    const existing = await GreetingDedup.findOneAndUpdate(
      { key },
      { $setOnInsert: { key, date: new Date() } },
      { upsert: true, new: false }
    )
    if (existing) return // already sent this slot today

    const res = await fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat.id, text, parse_mode: 'HTML' }),
    })
    const data = await res.json()
    if (!data.ok) await GreetingDedup.deleteOne({ key }) // release for retry
  } catch { /* never block message handling */ }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  try {
    const update = await request.json()

    await connectDB()
    const bot = await Bot.findOne({ botId: params.botId, isActive: true })

    if (!bot) {
      return NextResponse.json({ ok: true })
    }

    // Handle different update types
    if (update.message) {
      const msgText = update.message.text || ''

      // Opportunistic greeting on group activity. Skip on service messages
      // (new member join, member leave) so the greeting and welcome don't
      // arrive together for the same join event.
      if (!update.message.new_chat_members && !update.message.left_chat_member) {
        await maybeSendGreeting(update.message, bot)
      }

      // Check for new member join
      if (update.message.new_chat_members) {
        await handleNewMembers(update.message, bot)
      } else if (msgText.match(/^\/spamdebug/i)) {
        // Diagnostic command: report live anti-spam state in-chat
        await handleSpamDebug(update.message, bot)
      } else if (msgText.match(/^\/welcomedebug/i)) {
        // Diagnostic command: report live welcome state in-chat
        await handleWelcomeDebug(update.message, bot)
      } else if (msgText.match(/^\/(mute|unmute|kick|ban|unban)/i)) {
        // Handle moderation commands - skip force join check
        await handleCommand(update.message, bot)
      } else {
        await handleMessage(update.message, bot)
      }
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query, bot)
    } else if (update.my_chat_member) {
      await handleMyChatMember(update.my_chat_member, bot)
    } else if (update.chat_member) {
      // Fires on self-join via link/search in supergroups (no service message)
      await handleChatMemberUpdate(update.chat_member, bot)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ ok: true })
  }
}

// Handle callback query (verify join button)
async function handleCallbackQuery(callbackQuery: any, bot: any) {
  const data = callbackQuery.data
  const user = callbackQuery.from
  const message = callbackQuery.message

  if (data && data.startsWith('verify_join_')) {
    const targetUserId = data.replace('verify_join_', '')

    // Only the mentioned user can click
    if (String(user.id) !== targetUserId) {
      await answerCallbackQuery(bot.token, callbackQuery.id, '❌ Tombol ini bukan untukmu!')
      return
    }

    // Check if user has now joined all channels
    const notJoined = await getNotJoinedChannels(bot.token, user.id, bot.channels)

    if (notJoined.length === 0) {
      // User has joined all channels - delete the warning message
      await deleteMessage(bot.token, message.chat.id, message.message_id)
      await answerCallbackQuery(bot.token, callbackQuery.id, '✅ Verifikasi berhasil! Kamu bisa kirim pesan sekarang.')

      // Send success message (skip if disabled)
      if (bot.successMessage !== '__disabled__') {
        await sendSuccessMessage(bot.token, message.chat.id, user, bot.successMessage)
      }
    } else {
      const channelNames = notJoined.map((c: any) => c.channelTitle).join(', ')
      await answerCallbackQuery(
        bot.token,
        callbackQuery.id,
        `❌ Kamu belum join: ${channelNames}`
      )
    }
  }
}

// Send success message after user joined all channels
async function sendSuccessMessage(token: string, chatId: number, user: any, customMessage: string) {
  const userName = user.first_name || 'User'
  const userMention = user.username ? `@${user.username}` : userName

  let text = customMessage || `✅ <b>${userMention}</b>, terima kasih sudah join! Sekarang kamu bisa kirim pesan di grup ini.`

  // Replace variables
  const mention = `<a href="tg://user?id=${user.id}">${userName}</a>`
  text = text.replace(/{mention}/g, mention)
  text = text.replace(/{name}/g, userName)
  text = text.replace(/{username}/g, user.username ? `@${user.username}` : userName)
  text = text.replace(/{id}/g, String(user.id))
  text = text.replace(/{user}/g, `<b>${userMention}</b>`)

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    })

    const data = await res.json()

    // Auto-delete success message after 15 seconds
    if (data.ok) {
      setTimeout(async () => {
        await deleteMessage(token, chatId, data.result.message_id)
      }, 15000)
    }
  } catch (error) {
    console.error('Send success message error:', error)
  }
}

// Answer callback query
async function answerCallbackQuery(token: string, callbackQueryId: string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: true,
      }),
    })
  } catch (error) {
    console.error('Answer callback error:', error)
  }
}

// Escape HTML special chars so dynamic values (names, titles) don't break
// Telegram's HTML parse mode (which would cause the message to fail silently).
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Send the welcome message for a single member (shared by new_chat_members
// service messages AND chat_member updates). Dedup prevents a double welcome
// when Telegram delivers both for the same join.
async function sendWelcome(chat: any, member: any, bot: any) {
  if (!member || member.is_bot) return
  if (chat.type !== 'group' && chat.type !== 'supergroup') return
  if (!bot.enabledFeatures || !bot.enabledFeatures.includes('welcome')) return
  if (bot.welcomeMessage === '__disabled__') return

  // Per-bot dedup ONLY: collapse the pair of events Telegram delivers for the
  // same join (new_chat_members + chat_member, ~1s apart). Cross-bot dedup is
  // intentionally NOT used - the enabledFeatures gate above already ensures
  // only the bot owning the 'welcome' feature sends. Including botId in the
  // key keeps each bot's dedup independent and bug-free.
  // Dedup pendek: cukup untuk meredam pasangan event Telegram
  // (new_chat_members + chat_member yang datang ~1 detik) untuk satu bot.
  // Setelah 3 detik, member yang sama bisa disambut lagi (misal saat tes
  // berulang atau rejoin). Tidak menahan akun manapun "ter-block" di DB.
  const dedupKey = `welcome_${bot.botId}_${chat.id}_${member.id}`
  const DEDUP_WINDOW_MS = 3 * 1000
  try {
    const existing: any = await Counter.findOne({ key: dedupKey })
    if (existing && Date.now() - (existing.firstMsg || 0) < DEDUP_WINDOW_MS) return
    await Counter.updateOne(
      { key: dedupKey },
      { $set: { key: dedupKey, count: 1, firstMsg: Date.now() } },
      { upsert: true }
    )
  } catch { /* dedup failures must not block the welcome */ }

  const name = escapeHtml(member.first_name || 'User')
  const username = member.username ? `@${escapeHtml(member.username)}` : name
  const mention = `<a href="tg://user?id=${member.id}">${name}</a>`

  // {group} → clickable link to the group when it is public (has username),
  // otherwise just the bold title. Taken automatically from the chat.
  const rawGroupTitle = escapeHtml(chat.title || 'grup')
  const groupTitle = chat.username
    ? `<a href="https://t.me/${chat.username}">${rawGroupTitle}</a>`
    : `<b>${rawGroupTitle}</b>`

  // Build {channel} list from bot's channels array as clickable links,
  // taken automatically from the bot config (no manual text needed).
  const channelList = (bot.channels || [])
    .map((ch: any) => {
      const title = escapeHtml(ch.channelTitle || (ch.channelUsername ? `@${ch.channelUsername}` : ch.channelId))
      if (ch.channelUsername) {
        return `<a href="https://t.me/${ch.channelUsername}">${title}</a>`
      }
      return title
    })
    .join(', ') || '-'

  let text = bot.welcomeMessage && bot.welcomeMessage.trim()
    ? bot.welcomeMessage
    : `👋 Selamat datang {mention} di {group}!\n\nSilakan baca peraturan grup ya.`

  text = text
    .replace(/{mention}/g, mention)
    .replace(/{name}/g, name)
    .replace(/{username}/g, username)
    .replace(/{id}/g, String(member.id))
    .replace(/{group}/g, groupTitle)
    .replace(/{channel}/g, channelList)
    .replace(/{channels}/g, channelList)

  // Any {@something} → clickable link to that Telegram channel/username.
  // e.g. {@chrichstore} becomes a tappable @chrichstore link. This is
  // applied last so it doesn't clash with the variables above.
  text = text.replace(/{@([A-Za-z0-9_]{2,})}/g, (_m: string, uname: string) =>
    `<a href="https://t.me/${uname}">@${uname}</a>`
  )

  try {
    const res = await fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat.id, text, parse_mode: 'HTML' }),
    })
    const data = await res.json()
    // If HTML parse failed (e.g. bad custom tags), retry as plain text.
    if (!data.ok) {
      await fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat.id, text: text.replace(/<[^>]+>/g, '') }),
      })
    }
  } catch (error) {
    console.error('Welcome error:', error)
  }
}

// new_chat_members service message (member added by someone / classic groups)
async function handleNewMembers(message: any, bot: any) {
  const chat = message.chat
  for (const member of message.new_chat_members || []) {
    await sendWelcome(chat, member, bot)
  }
}

// chat_member update (fires for self-join via link/search in supergroups,
// which does NOT produce a new_chat_members service message).
async function handleChatMemberUpdate(update: any, bot: any) {
  const oldStatus = update.old_chat_member?.status
  const newStatus = update.new_chat_member?.status
  const member = update.new_chat_member?.user

  // Treat as a join: was outside the group, now a normal member.
  const wasOutside = oldStatus === 'left' || oldStatus === 'kicked' || !oldStatus
  const nowInside = newStatus === 'member' || (newStatus === 'restricted' && update.new_chat_member?.is_member)

  if (wasOutside && nowInside) {
    await sendWelcome(update.chat, member, bot)
    return
  }

  // User left/was-kicked -> clear THIS bot's welcome dedup so a quick rejoin
  // is welcomed again. Cleared per-bot (matches new dedup key format).
  const nowOutside = newStatus === 'left' || newStatus === 'kicked'
  if (!wasOutside && nowOutside && member) {
    try {
      await Counter.deleteOne({ key: `welcome_${bot.botId}_${update.chat.id}_${member.id}` })
    } catch { /* best effort */ }
  }
}

// Handle when bot is added/removed from a group
async function handleMyChatMember(update: any, bot: any) {
  const chat = update.chat
  const newStatus = update.new_chat_member?.status

  if (chat.type === 'group' || chat.type === 'supergroup') {
    if (newStatus === 'administrator' || newStatus === 'member') {
      // Bot added to group - save group
      const groupExists = bot.groups.find((g: any) => g.groupId === String(chat.id))
      if (!groupExists) {
        bot.groups.push({
          groupId: String(chat.id),
          groupTitle: chat.title,
        })
        await bot.save()
      }
    } else if (newStatus === 'left' || newStatus === 'kicked') {
      // Bot removed from group
      bot.groups = bot.groups.filter((g: any) => g.groupId !== String(chat.id))
      await bot.save()
    }
  }
}

// Counters stored in MongoDB for persistence across serverless invocations
async function getCounter(key: string): Promise<{ count: number; firstMsg: number }> {
  try {
    const counter = await Counter.findOne({ key })
    if (counter) return { count: counter.count, firstMsg: counter.firstMsg }
    return { count: 0, firstMsg: 0 }
  } catch { return { count: 0, firstMsg: 0 } }
}

async function setCounter(key: string, count: number, firstMsg: number) {
  try {
    await Counter.findOneAndUpdate(
      { key },
      { count, firstMsg },
      { upsert: true, new: true }
    )
  } catch {}
}

async function resetCounter(key: string) {
  try { await Counter.deleteOne({ key }) } catch {}
}

// Sliding-window message counter for anti-spam.
//
// The previous fixed-window approach measured the window from the FIRST message
// and reset the whole count to 1 as soon as one message fell outside the window
// - discarding recent messages that were still relevant. With human-paced
// messages this made the count oscillate (1->2->1->2) and never reach the limit.
//
// This records the send-time of each message and counts how many fall within the
// last `intervalMs`. $push is additive so concurrent serverless invocations can't
// lose increments. `nowMs` is the Telegram send time (message.date), immune to
// serverless processing delays.
async function slidingWindowHit(key: string, intervalMs: number, nowMs: number): Promise<number> {
  const cutoff = nowMs - intervalMs
  try {
    // 1 op: append this message's timestamp and get the full array back.
    const doc = await Counter.findOneAndUpdate(
      { key },
      { $push: { hits: nowMs } },
      { upsert: true, new: true }
    ).lean<{ hits: number[] }>()

    const recent = (doc?.hits || []).filter((t: number) => t >= cutoff)

    // 1 op: persist the trimmed window (also keep count/firstMsg for /spamdebug).
    await Counter.updateOne(
      { key },
      { $set: { hits: recent, count: recent.length, firstMsg: recent[0] || nowMs } }
    )

    return recent.length || 1
  } catch {
    return 1
  }
}

// Restrict (mute) a user. Returns the Telegram API result so callers can
// detect permission problems instead of failing silently:
// - bot is not an admin in the group
// - bot lacks the "Restrict members" permission
// - the chat is a basic group (mute only works in supergroups)
async function muteUser(
  token: string,
  chatId: number,
  userId: number,
  seconds: number
): Promise<{ ok: boolean; description?: string }> {
  try {
    const untilDate = Math.floor(Date.now() / 1000) + seconds
    const res = await fetch(`https://api.telegram.org/bot${token}/restrictChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: userId,
        permissions: { can_send_messages: false, can_send_audios: false, can_send_documents: false, can_send_photos: false, can_send_videos: false, can_send_video_notes: false, can_send_voice_notes: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false },
        until_date: untilDate,
      }),
    })
    const data = await res.json()
    if (!data.ok) console.error('restrictChatMember failed:', data.description)
    return { ok: !!data.ok, description: data.description }
  } catch (e: any) {
    console.error('muteUser error:', e?.message)
    return { ok: false, description: e?.message }
  }
}

// Diagnostic command: reply in-chat with the live anti-spam state so issues
// can be diagnosed without access to server logs.
async function handleSpamDebug(message: any, bot: any) {
  const chat = message.chat
  const user = message.from
  if (!user) return
  if (chat.type !== 'group' && chat.type !== 'supergroup') {
    await fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat.id, text: '⚠️ /spamdebug hanya bekerja di dalam grup.' }),
    })
    return
  }

  const isAdmin = await checkIfAdmin(bot.token, chat.id, user.id)
  const features = bot.enabledFeatures || []
  const hasAntiSpam = bot.antiSpamEnabled === true || features.includes('anti_spam')

  const key = `${chat.id}_${user.id}_spam`
  const c = await getCounter(key)
  const sinceSec = c.firstMsg ? Math.round((Date.now() - c.firstMsg) / 1000) : 0

  const lines = [
    '🔍 <b>Anti-Spam Debug</b>',
    '',
    `Chat type: <code>${chat.type}</code>`,
    `Anti-spam aktif: ${hasAntiSpam ? '✅ YA' : '❌ TIDAK'}`,
    `Kamu admin: ${isAdmin ? '⚠️ YA → anti-spam DILEWATI untuk admin!' : 'TIDAK (akan dicek)'}`,
    `Batas: <b>${bot.antiSpamLimit || 5}</b> pesan dalam <b>${bot.antiSpamInterval || 10}</b> detik`,
    `Durasi mute: ${bot.antiSpamMuteDuration || '5m'}`,
    `Counter kamu sekarang: <b>${c.count}</b> (window dimulai ${sinceSec}s lalu)`,
    `enabledFeatures: <code>${features.join(', ') || '(kosong)'}</code>`,
    `antiSpamEnabled flag: <code>${String(bot.antiSpamEnabled)}</code>`,
  ]

  await fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat.id, text: lines.join('\n'), parse_mode: 'HTML' }),
  })
}

// Diagnostic command: reply in-chat with the live welcome-feature state so
// admins can diagnose why /welcome isn't firing without checking server logs.
//
// Reports six layers, top-down (each must pass for welcome to fire):
//   1. Feature enabled? (`enabledFeatures.includes('welcome')`)
//   2. Welcome message not disabled? (not `__disabled__`)
//   3. Bot admin in chat? (required for `chat_member` self-join updates)
//   4. allowed_updates includes `chat_member`? (else self-join welcome silent)
//   5. Webhook healthy? (no last_error, no high pending_update_count)
//   6. Custom welcome message preview (so admin sees what would actually send)
async function handleWelcomeDebug(message: any, bot: any) {
  const chat = message.chat
  const user = message.from
  if (!user) return
  if (chat.type !== 'group' && chat.type !== 'supergroup') {
    await fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat.id, text: '⚠️ /welcomedebug hanya bekerja di dalam grup.' }),
    })
    return
  }

  const features = bot.enabledFeatures || []
  const hasWelcome = features.includes('welcome')
  const isDisabled = bot.welcomeMessage === '__disabled__'
  const hasCustom = !!(bot.welcomeMessage && bot.welcomeMessage.trim() && !isDisabled)

  // Run 3 Telegram API calls in parallel: getMe, getWebhookInfo,
  // getChatMember(bot). Cuts wait time vs sequential calls.
  let botAdminStatus = '?'
  let webhookInfo: any = null
  try {
    const meRes = await fetch(`https://api.telegram.org/bot${bot.token}/getMe`)
    const meData = await meRes.json()
    if (meData.ok) {
      const [whRes, cmRes] = await Promise.all([
        fetch(`https://api.telegram.org/bot${bot.token}/getWebhookInfo`),
        fetch(`https://api.telegram.org/bot${bot.token}/getChatMember?chat_id=${chat.id}&user_id=${meData.result.id}`),
      ])
      const [whData, cmData] = await Promise.all([whRes.json(), cmRes.json()])
      if (cmData.ok) botAdminStatus = cmData.result.status
      if (whData.ok) webhookInfo = whData.result
    }
  } catch { /* ignore network errors so the command still replies */ }

  // chat_member in allowed_updates is the gating requirement for self-join
  // (link/search) welcome. Default Telegram allowed_updates does NOT include
  // chat_member, so the omission is silent until you check this.
  const allowedUpdates: string[] = webhookInfo?.allowed_updates || []
  const hasChatMember = allowedUpdates.length === 0
    ? false // empty array means "default", which excludes chat_member
    : allowedUpdates.includes('chat_member')
  const lastError: string = webhookInfo?.last_error_message || ''
  const lastErrorAge: number = webhookInfo?.last_error_date
    ? Math.round((Date.now() / 1000) - webhookInfo.last_error_date)
    : 0
  const pending: number = webhookInfo?.pending_update_count || 0

  // Existing dedup record for this user (3s window); explains "join again, no welcome".
  const dedupKey = `welcome_${bot.botId}_${chat.id}_${user.id}`
  let dedupInfo = 'tidak ada'
  try {
    const dedup: any = await Counter.findOne({ key: dedupKey })
    if (dedup) {
      const ageSec = Math.round((Date.now() - (dedup.firstMsg || 0)) / 1000)
      dedupInfo = `aktif (${ageSec}s lalu)`
    }
  } catch { /* ignore */ }

  const status = !hasWelcome
    ? '❌ Fitur welcome BELUM diaktifkan'
    : isDisabled
    ? '⚠️ Welcome dinonaktifkan via tombol "Hapus Pesan"'
    : hasCustom
    ? '✅ Aktif (pakai pesan custom)'
    : '✅ Aktif (pakai pesan default)'

  // Preview welcome message - first 120 chars, escaped so HTML in the message
  // doesn't break this debug message itself.
  const escapeHtmlLocal = (s: string) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const previewSrc = isDisabled
    ? ''
    : hasCustom
    ? bot.welcomeMessage
    : '👋 Selamat datang {mention} di {group}!'
  const preview = previewSrc
    ? escapeHtmlLocal(previewSrc.slice(0, 120)) + (previewSrc.length > 120 ? '...' : '')
    : '(tidak ada)'

  const lines = [
    '🔍 <b>Welcome Debug</b>',
    '',
    `1. Status fitur: ${status}`,
    `2. Chat type: <code>${chat.type}</code>`,
    `3. Bot status di grup: <code>${botAdminStatus}</code>`,
    botAdminStatus !== 'administrator' && botAdminStatus !== 'creator'
      ? '   ⚠️ Bot bukan admin → welcome via self-join (link/cari) <b>tidak</b> akan jalan'
      : '   ✅ Bot admin → welcome jalan untuk semua tipe join',
    `4. allowed_updates: <code>${allowedUpdates.join(', ') || '(default)'}</code>`,
    hasChatMember
      ? '   ✅ <code>chat_member</code> ada → self-join welcome bisa fire'
      : '   ❌ <code>chat_member</code> TIDAK di-subscribe → user yang join via link/cari TIDAK akan trigger welcome.\n   Klik <b>"Force Fix Webhook"</b> di dashboard untuk perbaiki.',
    `5. Webhook last_error: ${lastError ? `❌ <code>${escapeHtmlLocal(lastError).slice(0, 100)}</code> (${lastErrorAge}s lalu)` : '✅ tidak ada'}`,
    `   Pending updates: <b>${pending}</b>${pending > 50 ? ' ⚠️ webhook lambat/macet' : ''}`,
    `6. Preview welcome:\n   <code>${preview}</code>`,
    '',
    `Dedup record kamu: ${dedupInfo}`,
    `enabledFeatures: <code>${features.join(', ') || '(kosong)'}</code>`,
  ]

  await fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat.id, text: lines.join('\n'), parse_mode: 'HTML' }),
  })
}

// Handle incoming messages
async function handleMessage(message: any, bot: any) {
  const chat = message.chat
  const user = message.from
  const text = message.text || message.caption || ''

  // Only process group messages
  if (chat.type !== 'group' && chat.type !== 'supergroup') {
    return
  }

  // Skip messages from channel posts (sender_chat = channel)
  if (message.sender_chat) {
    return
  }

  // Skip messages from bots
  if (!user || user.is_bot) {
    return
  }

  // Skip forwarded messages from linked channel (auto-forward)
  if (message.is_automatic_forward) {
    return
  }

  // Skip messages from admins for all checks
  const isAdmin = await checkIfAdmin(bot.token, chat.id, user.id)
  if (isAdmin) {
    return
  }

  const features = bot.enabledFeatures || []
  // Each feature must be explicitly enabled on this bot. In a multi-bot group,
  // bots that haven't been given a feature stay completely silent for it -
  // no actions, no error replies. Anti-spam additionally accepts the legacy
  // boolean flag for backward-compat with older configs.
  const hasAntiSpam = features.includes('anti_spam') || bot.antiSpamEnabled === true
  const hasAntiForward = features.includes('anti_forward')
  const hasBannedWords = features.includes('banned_words') && bot.bannedWords && bot.bannedWords.length > 0
  const hasForceJoin = features.includes('force_join') && bot.channels && bot.channels.length > 0
  const userName = user.first_name || 'User'
  const userMention = `<a href="tg://user?id=${user.id}">${userName}</a>`

  // === ANTI-FORWARD CHECK (peringatan 3x lalu mute) ===
  if (hasAntiForward) {
    // Check if message is forwarded from OUTSIDE the group (not from our channels)
    if (message.forward_from || message.forward_from_chat || message.forward_sender_name) {
      // Skip if forwarded from our own channels
      const isOurChannel = message.forward_from_chat && 
        bot.channels.find((c: any) => c.channelId === String(message.forward_from_chat.id))
      
      if (!isOurChannel) {
        // Delete the forwarded message
        await deleteMessage(bot.token, chat.id, message.message_id)

        // Track warnings
        const key = `${chat.id}_${user.id}_forward`
        const fwdCounter = await getCounter(key)
        const warningCount = fwdCounter.count + 1
        await setCounter(key, warningCount, Date.now())
        const warningLimit = bot.antiForwardWarningLimit || 3

        if (warningCount >= warningLimit) {
          // Mute after reaching limit
          const muteDuration = bot.antiForwardMuteDuration || '1h'
          const seconds = parseDurationSimple(muteDuration)
          const untilDate = Math.floor(Date.now() / 1000) + seconds

          await fetch(`https://api.telegram.org/bot${bot.token}/restrictChatMember`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chat.id,
              user_id: user.id,
              permissions: { can_send_messages: false, can_send_audios: false, can_send_documents: false, can_send_photos: false, can_send_videos: false, can_send_video_notes: false, can_send_voice_notes: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false },
              until_date: untilDate,
            }),
          })

          await resetCounter(key)
          const customMuteMsg = bot.antiForwardMuteMessage || `🚫 ${userMention} di-mute ${muteDuration} karena forward pesan dari luar grup (${warningLimit}x peringatan).`
          const finalMuteMsg = customMuteMsg.replace(/{mention}/g, userMention).replace(/{name}/g, userName).replace(/{duration}/g, muteDuration).replace(/{limit}/g, String(warningLimit))
          await sendAutoDeleteMsg(bot.token, chat.id, finalMuteMsg, 10000)
        } else {
          const customWarnMsg = bot.antiForwardWarningMessage || `⚠️ ${userMention}, dilarang forward pesan dari luar grup! Peringatan ${warningCount}/${warningLimit}.`
          const finalWarnMsg = customWarnMsg.replace(/{mention}/g, userMention).replace(/{name}/g, userName).replace(/{count}/g, String(warningCount)).replace(/{limit}/g, String(warningLimit))
          await sendAutoDeleteMsg(bot.token, chat.id, finalWarnMsg, 7000)
        }
        return
      }
    }
  }

  // === BANNED WORDS CHECK ===
  if (hasBannedWords && bot.bannedWords && bot.bannedWords.length > 0) {
    const lowerText = text.toLowerCase()
    const foundWord = bot.bannedWords.find((word: string) => lowerText.includes(word.toLowerCase()))

    if (foundWord) {
      // Delete the message
      await deleteMessage(bot.token, chat.id, message.message_id)

      const action = bot.bannedWordsAction || 'delete_warn'

      if (action === 'delete_warn') {
        const customMsg = bot.bannedWordsMessage || `⚠️ ${userMention}, pesanmu dihapus karena mengandung kata terlarang.`
        const finalMsg = customMsg.replace(/{mention}/g, userMention).replace(/{name}/g, userName).replace(/{word}/g, foundWord)
        await sendAutoDeleteMsg(bot.token, chat.id, finalMsg, 5000)
      } else if (action === 'delete_mute') {
        const customMsg = bot.bannedWordsMessage || `🔇 ${userMention} di-mute 5 menit karena menggunakan kata terlarang.`
        const finalMsg = customMsg.replace(/{mention}/g, userMention).replace(/{name}/g, userName).replace(/{word}/g, foundWord)
        // Mute 5 minutes
        const untilDate = Math.floor(Date.now() / 1000) + 300
        await fetch(`https://api.telegram.org/bot${bot.token}/restrictChatMember`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chat.id,
            user_id: user.id,
            permissions: { can_send_messages: false, can_send_audios: false, can_send_documents: false, can_send_photos: false, can_send_videos: false, can_send_video_notes: false, can_send_voice_notes: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false },
            until_date: untilDate,
          }),
        })
        await sendAutoDeleteMsg(bot.token, chat.id, finalMsg, 7000)
      } else {
        // delete_only - just delete
      }
      return
    }
  }

  // === ANTI-SPAM CHECK (gate pakai antiSpamEnabled boolean - reliable) ===
  if (hasAntiSpam) {
    const key = `${chat.id}_${user.id}_spam`
    const intervalMs = (bot.antiSpamInterval || 10) * 1000
    const limit = bot.antiSpamLimit || 5

    // Window is measured by message SEND time (Telegram message.date, in seconds),
    // not server processing time, so serverless delays don't reset the window.
    const sentAtMs = message.date ? message.date * 1000 : Date.now()
    const newCount = await slidingWindowHit(key, intervalMs, sentAtMs)

    // Use >= so a limit of N mutes exactly on the Nth message (matches the UI
    // "Batas pesan = N"). Previously used > which required N+1 messages, so with
    // a tight window (e.g. 3 msgs / 1s) the trigger was never reached.
    if (newCount >= limit) {
      const muteDuration = bot.antiSpamMuteDuration || '5m'
      const seconds = parseDurationSimple(muteDuration)

      // Run independent actions in parallel to minimise delay before the mute
      // takes effect (reset counter, delete the message, restrict the user).
      const [, , result] = await Promise.all([
        resetCounter(key),
        deleteMessage(bot.token, chat.id, message.message_id),
        muteUser(bot.token, chat.id, user.id, seconds),
      ])

      if (result.ok) {
        const customMsg = bot.antiSpamMessage || `🚫 ${userMention} di-mute ${muteDuration} karena spam (${limit} pesan dalam ${bot.antiSpamInterval || 10} detik).`
        const finalMsg = customMsg.replace(/{mention}/g, userMention).replace(/{name}/g, userName).replace(/{duration}/g, muteDuration).replace(/{limit}/g, String(limit))
        await sendAutoDeleteMsg(bot.token, chat.id, finalMsg, 10000)
      } else {
        // Don't fail silently: tell admins why the spammer wasn't muted.
        await sendAutoDeleteMsg(
          bot.token,
          chat.id,
          `⚠️ Spam terdeteksi dari ${userMention}, tapi bot gagal mute.\n\nPastikan bot adalah <b>admin</b> dengan izin <b>Restrict members</b>, dan grup bertipe <b>supergroup</b>.`,
          15000
        )
      }
      return
    }
  }

  // === FORCE JOIN CHECK ===
  // Respect the on/off toggle: only enforce when forceJoinEnabled is not false.
  if (hasForceJoin && bot.forceJoinEnabled !== false) {
    if (bot.channels && bot.channels.length > 0) {
      // Skip forwarded messages from our own channels
      if (message.forward_from_chat) {
        const forwardedChatId = String(message.forward_from_chat.id)
        const isOurChannel = bot.channels.find((c: any) => c.channelId === forwardedChatId)
        if (isOurChannel) return
      }

      const notJoined = await getNotJoinedChannels(bot.token, user.id, bot.channels)

      if (notJoined.length > 0) {
        await deleteMessage(bot.token, chat.id, message.message_id)

        if (bot.forceJoinMessage !== '__disabled__') {
          await sendForceJoinWarning(bot.token, chat.id, user, notJoined, bot.forceJoinMessage)
        }
      }
    }
  }
}

// Parse duration string helper
function parseDurationSimple(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/)
  if (!match) return 300 // default 5 minutes
  const value = parseInt(match[1])
  const unit = match[2]
  switch (unit) {
    case 's': return value
    case 'm': return value * 60
    case 'h': return value * 3600
    case 'd': return value * 86400
    default: return 300
  }
}

// Send auto-delete message
async function sendAutoDeleteMsg(token: string, chatId: number, text: string, deleteAfterMs: number) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
    const data = await res.json()
    if (data.ok && deleteAfterMs > 0) {
      setTimeout(async () => {
        await deleteMessage(token, chatId, data.result.message_id)
      }, deleteAfterMs)
    }
  } catch (error) {
    console.error('Send auto-delete msg error:', error)
  }
}

// Check if user is admin in the group
async function checkIfAdmin(token: string, chatId: number, userId: number): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getChatMember?chat_id=${chatId}&user_id=${userId}`
    )
    const data = await res.json()

    if (data.ok) {
      const status = data.result.status
      return status === 'creator' || status === 'administrator'
    }
    return false
  } catch {
    return false
  }
}

// Get list of channels user hasn't joined
async function getNotJoinedChannels(
  token: string,
  userId: number,
  channels: { channelId: string; channelUsername: string; channelTitle: string }[]
): Promise<{ channelId: string; channelUsername: string; channelTitle: string }[]> {
  const notJoined = []

  for (const channel of channels) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/getChatMember?chat_id=${channel.channelId}&user_id=${userId}`
      )
      const data = await res.json()

      if (data.ok) {
        const status = data.result.status
        if (status === 'left' || status === 'kicked') {
          notJoined.push(channel)
        }
      } else {
        notJoined.push(channel)
      }
    } catch {
      notJoined.push(channel)
    }
  }

  return notJoined
}

// Delete a message
async function deleteMessage(token: string, chatId: number, messageId: number) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    })
  } catch (error) {
    console.error('Delete message error:', error)
  }
}

// Send force join warning with inline buttons
async function sendForceJoinWarning(
  token: string,
  chatId: number,
  user: any,
  notJoinedChannels: { channelId: string; channelUsername: string; channelTitle: string }[],
  customMessage: string
) {
  const userName = user.first_name || 'User'
  const userMention = user.username ? `@${user.username}` : userName
  // Clickable channel links (public → t.me/username). Falls back to title.
  const channelList = notJoinedChannels
    .map((c) => {
      const title = c.channelTitle || (c.channelUsername ? `@${c.channelUsername}` : c.channelId)
      return c.channelUsername
        ? `📢 <a href="https://t.me/${c.channelUsername}">${title}</a>`
        : `📢 ${title}`
    })
    .join('\n')

  let text: string

  if (customMessage) {
    // Use custom message with variable replacement
    const mention = `<a href="tg://user?id=${user.id}">${userName}</a>`
    text = customMessage
      .replace(/{mention}/g, mention)
      .replace(/{name}/g, userName)
      .replace(/{username}/g, user.username ? `@${user.username}` : userName)
      .replace(/{id}/g, String(user.id))
      .replace(/{user}/g, `<b>${userMention}</b>`)
      .replace(/{channels}/g, channelList)
      .replace(/{channel}/g, channelList)
    // Any {@something} → clickable channel link
    text = text.replace(/{@([A-Za-z0-9_]{2,})}/g, (_m: string, uname: string) =>
      `<a href="https://t.me/${uname}">@${uname}</a>`
    )
  } else {
    // Default message
    text = `⚠️ <b>${userMention}</b>, kamu harus join channel berikut sebelum bisa kirim pesan di grup ini:\n\n${channelList}\n\nSilakan join channel di bawah, lalu coba kirim pesan lagi.`
  }

  // Create inline keyboard with join buttons
  const buttons = notJoinedChannels.map((channel) => ([{
    text: `Join ${channel.channelTitle}`,
    url: channel.channelUsername
      ? `https://t.me/${channel.channelUsername}`
      : `https://t.me/c/${channel.channelId.replace('-100', '')}`,
  }]))

  // Add "Sudah Join" verification button
  buttons.push([{
    text: '✅ Sudah Join',
    callback_data: `verify_join_${user.id}`,
  }])

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons },
      }),
    })

    const data = await res.json()

    // Auto-delete warning after 30 seconds
    if (data.ok) {
      setTimeout(async () => {
        await deleteMessage(token, chatId, data.result.message_id)
      }, 30000)
    }
  } catch (error) {
    console.error('Send warning error:', error)
  }
}
