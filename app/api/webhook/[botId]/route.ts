import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Bot from '@/lib/models/Bot'
import Counter from '@/lib/models/Counter'
import { handleCommand } from './handleCommand'

export const dynamic = 'force-dynamic'

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

      // Check for new member join
      if (update.message.new_chat_members) {
        await handleNewMembers(update.message, bot)
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

// Handle new members joining the group
async function handleNewMembers(message: any, bot: any) {
  const chat = message.chat
  const newMembers = message.new_chat_members

  // Skip if welcome is not enabled
  if (!bot.enabledFeatures || !bot.enabledFeatures.includes('welcome')) {
    return
  }

  // Skip if welcome message is disabled
  if (bot.welcomeMessage === '__disabled__') {
    return
  }

  // Only process group messages
  if (chat.type !== 'group' && chat.type !== 'supergroup') {
    return
  }

  for (const member of newMembers) {
    // Skip bots
    if (member.is_bot) continue

    const userName = member.first_name || 'User'
    const userMention = member.username ? `@${member.username}` : userName
    const mention = `<a href="tg://user?id=${member.id}">${userName}</a>`

    let text = bot.welcomeMessage || `👋 Selamat datang <b>${userName}</b> di grup <b>${chat.title}</b>!\n\nSilakan baca rules dan perkenalkan dirimu.`

    // Replace variables
    text = text.replace(/{mention}/g, mention)
    text = text.replace(/{name}/g, userName)
    text = text.replace(/{username}/g, member.username ? `@${member.username}` : userName)
    text = text.replace(/{id}/g, String(member.id))
    text = text.replace(/{user}/g, `<b>${userMention}</b>`)
    text = text.replace(/{group}/g, chat.title || 'grup')

    try {
      await fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chat.id,
          text,
          parse_mode: 'HTML',
        }),
      })
    } catch (error) {
      console.error('Welcome message error:', error)
    }
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
  const userName = user.first_name || 'User'
  const userMention = `<a href="tg://user?id=${user.id}">${userName}</a>`

  // === ANTI-FORWARD CHECK (peringatan 3x lalu mute) ===
  if (features.includes('anti_forward')) {
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
  if (features.includes('banned_words') && bot.bannedWords && bot.bannedWords.length > 0) {
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

  // === ANTI-SPAM CHECK ===
  if (features.includes('anti_spam')) {
    const key = `spam_${chat.id}_${user.id}`
    const now = Date.now()
    const interval = (bot.antiSpamInterval || 10) * 1000
    const limit = bot.antiSpamLimit || 5

    try {
      const counter = await Counter.findOne({ key })

      if (!counter) {
        await Counter.create({ key, count: 1, firstMsg: now })
      } else if ((now - counter.firstMsg) > interval) {
        counter.count = 1
        counter.firstMsg = now
        await counter.save()
      } else {
        counter.count += 1
        await counter.save()

        if (counter.count > limit) {
          const muteDuration = bot.antiSpamMuteDuration || '5m'
          const seconds = parseDurationSimple(muteDuration)
          const untilDate = Math.floor(Date.now() / 1000) + seconds

          await deleteMessage(bot.token, chat.id, message.message_id)

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

          counter.count = 0
          await counter.save()

          const customMsg = bot.antiSpamMessage || `🚫 ${userMention} di-mute ${muteDuration} karena spam (>${limit} pesan dalam ${bot.antiSpamInterval || 10} detik).`
          const finalMsg = customMsg.replace(/{mention}/g, userMention).replace(/{name}/g, userName).replace(/{duration}/g, muteDuration).replace(/{limit}/g, String(limit))
          await sendAutoDeleteMsg(bot.token, chat.id, finalMsg, 10000)
          return
        }
      }
    } catch (err) {
      console.error('Anti-spam error:', err)
    }
  }

  // === FORCE JOIN CHECK ===
  if (features.includes('force_join') || bot.forceJoinEnabled !== false) {
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
  const channelList = notJoinedChannels.map((c) => `📢 ${c.channelTitle}`).join('\n')

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
