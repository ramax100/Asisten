import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Bot from '@/lib/models/Bot'

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
      // Check for new member join
      if (update.message.new_chat_members) {
        await handleNewMembers(update.message, bot)
      } else if (update.message.text && update.message.text.startsWith('/')) {
        // Handle admin commands first
        await handleCommand(update.message, bot)
        // Also check force join for non-admin users
        if (!update.message.text.match(/^\/(mute|unmute|kick|ban|unban)/)) {
          await handleMessage(update.message, bot)
        }
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

// Handle admin commands (/mute, /kick, /ban, /unban, /unmute)
async function handleCommand(message: any, bot: any) {
  const chat = message.chat
  const user = message.from
  const text = message.text || ''

  // Only process in groups
  if (chat.type !== 'group' && chat.type !== 'supergroup') return

  // Check if moderation feature is enabled
  if (!bot.enabledFeatures || !bot.enabledFeatures.includes('moderation')) return

  // Only admins can use commands
  const isAdmin = await checkIfAdmin(bot.token, chat.id, user.id)
  if (!isAdmin) return

  // Get target user (from reply)
  const replyMsg = message.reply_to_message
  if (!replyMsg && (text.startsWith('/mute') || text.startsWith('/kick') || text.startsWith('/ban') || text.startsWith('/unmute') || text.startsWith('/unban'))) {
    await sendTempMessage(bot.token, chat.id, '⚠️ Reply pesan member yang ingin di-action.', 5000)
    return
  }

  if (!replyMsg) return

  const targetUser = replyMsg.from
  if (!targetUser) return

  // Don't allow action on admins
  const targetIsAdmin = await checkIfAdmin(bot.token, chat.id, targetUser.id)
  if (targetIsAdmin) {
    await sendTempMessage(bot.token, chat.id, '❌ Tidak bisa melakukan action pada admin.', 5000)
    return
  }

  const targetName = targetUser.first_name || 'User'
  const targetMention = `<a href="tg://user?id=${targetUser.id}">${targetName}</a>`

  // Parse command
  const parts = text.split(' ')
  const command = parts[0].replace('@' + bot.botUsername, '').toLowerCase()

  if (command === '/mute') {
    const duration = parts[1] || '1h'
    const seconds = parseDuration(duration)

    if (!seconds) {
      await sendTempMessage(bot.token, chat.id, '⚠️ Format durasi salah. Contoh: /mute 30s, /mute 5m, /mute 1h, /mute 1d', 5000)
      return
    }

    const untilDate = Math.floor(Date.now() / 1000) + seconds

    const res = await fetch(`https://api.telegram.org/bot${bot.token}/restrictChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat.id,
        user_id: targetUser.id,
        permissions: {
          can_send_messages: false,
          can_send_audios: false,
          can_send_documents: false,
          can_send_photos: false,
          can_send_videos: false,
          can_send_video_notes: false,
          can_send_voice_notes: false,
          can_send_polls: false,
          can_send_other_messages: false,
          can_add_web_page_previews: false,
        },
        until_date: untilDate,
      }),
    })

    const data = await res.json()
    if (data.ok) {
      await sendTempMessage(bot.token, chat.id, `🔇 ${targetMention} telah di-mute selama <b>${duration}</b>.`, 10000)
    } else {
      await sendTempMessage(bot.token, chat.id, `❌ Gagal mute: ${data.description}`, 5000)
    }

  } else if (command === '/unmute') {
    const res = await fetch(`https://api.telegram.org/bot${bot.token}/restrictChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat.id,
        user_id: targetUser.id,
        permissions: {
          can_send_messages: true,
          can_send_audios: true,
          can_send_documents: true,
          can_send_photos: true,
          can_send_videos: true,
          can_send_video_notes: true,
          can_send_voice_notes: true,
          can_send_polls: true,
          can_send_other_messages: true,
          can_add_web_page_previews: true,
        },
      }),
    })

    const data = await res.json()
    if (data.ok) {
      await sendTempMessage(bot.token, chat.id, `🔊 ${targetMention} telah di-unmute.`, 10000)
    } else {
      await sendTempMessage(bot.token, chat.id, `❌ Gagal unmute: ${data.description}`, 5000)
    }

  } else if (command === '/kick') {
    // Ban then unban = kick
    const banRes = await fetch(`https://api.telegram.org/bot${bot.token}/banChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat.id, user_id: targetUser.id }),
    })
    const banData = await banRes.json()

    if (banData.ok) {
      // Immediately unban so they can rejoin
      await fetch(`https://api.telegram.org/bot${bot.token}/unbanChatMember`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat.id, user_id: targetUser.id, only_if_banned: true }),
      })
      await sendTempMessage(bot.token, chat.id, `👢 ${targetMention} telah di-kick dari grup.`, 10000)
    } else {
      await sendTempMessage(bot.token, chat.id, `❌ Gagal kick: ${banData.description}`, 5000)
    }

  } else if (command === '/ban') {
    const res = await fetch(`https://api.telegram.org/bot${bot.token}/banChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat.id, user_id: targetUser.id }),
    })

    const data = await res.json()
    if (data.ok) {
      await sendTempMessage(bot.token, chat.id, `🚫 ${targetMention} telah di-ban dari grup.`, 10000)
    } else {
      await sendTempMessage(bot.token, chat.id, `❌ Gagal ban: ${data.description}`, 5000)
    }

  } else if (command === '/unban') {
    const res = await fetch(`https://api.telegram.org/bot${bot.token}/unbanChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat.id, user_id: targetUser.id, only_if_banned: true }),
    })

    const data = await res.json()
    if (data.ok) {
      await sendTempMessage(bot.token, chat.id, `✅ ${targetMention} telah di-unban.`, 10000)
    } else {
      await sendTempMessage(bot.token, chat.id, `❌ Gagal unban: ${data.description}`, 5000)
    }
  }
}

// Parse duration string (30s, 5m, 1h, 1d) to seconds
function parseDuration(duration: string): number | null {
  const match = duration.match(/^(\d+)([smhd])$/)
  if (!match) return null

  const value = parseInt(match[1])
  const unit = match[2]

  switch (unit) {
    case 's': return value
    case 'm': return value * 60
    case 'h': return value * 3600
    case 'd': return value * 86400
    default: return null
  }
}

// Send temporary message that auto-deletes
async function sendTempMessage(token: string, chatId: number, text: string, deleteAfterMs: number) {
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
    console.error('Send temp message error:', error)
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

// Handle incoming messages
async function handleMessage(message: any, bot: any) {
  const chat = message.chat
  const user = message.from

  // Only process group messages
  if (chat.type !== 'group' && chat.type !== 'supergroup') {
    return
  }

  // Skip if force join is disabled
  if (bot.forceJoinEnabled === false) {
    return
  }

  // Skip if bot has no channels configured
  if (bot.channels.length === 0) {
    return
  }

  // Skip forwarded messages from linked channel (auto-forward)
  if (message.is_automatic_forward) {
    return
  }

  // Skip forwarded messages from our own channels
  if (message.forward_from_chat) {
    const forwardedChatId = String(message.forward_from_chat.id)
    const isOurChannel = bot.channels.find((c: any) => c.channelId === forwardedChatId)
    if (isOurChannel) {
      return
    }
  }

  // Skip messages from channel posts (sender_chat = channel)
  if (message.sender_chat) {
    return
  }

  // Skip messages from bots
  if (user.is_bot) {
    return
  }

  // Skip messages from admins
  const isAdmin = await checkIfAdmin(bot.token, chat.id, user.id)
  if (isAdmin) {
    return
  }

  // Check if user has joined all required channels
  const notJoined = await getNotJoinedChannels(bot.token, user.id, bot.channels)

  if (notJoined.length > 0) {
    // Delete the user's message
    await deleteMessage(bot.token, chat.id, message.message_id)

    // Send warning with join buttons (skip if disabled)
    if (bot.forceJoinMessage !== '__disabled__') {
      await sendForceJoinWarning(bot.token, chat.id, user, notJoined, bot.forceJoinMessage)
    }
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
