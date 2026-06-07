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
      await handleMessage(update.message, bot)
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
    } else {
      const channelNames = notJoined.map((c) => c.channelTitle).join(', ')
      await answerCallbackQuery(
        bot.token,
        callbackQuery.id,
        `❌ Kamu belum join: ${channelNames}`
      )
    }
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

    // Send warning with join buttons
    await sendForceJoinWarning(bot.token, chat.id, user, notJoined)
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
        // If we can't check, assume not joined
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
  notJoinedChannels: { channelId: string; channelUsername: string; channelTitle: string }[]
) {
  const userName = user.first_name || 'User'
  const userMention = user.username ? `@${user.username}` : userName

  const text = `⚠️ <b>${userMention}</b>, kamu harus join channel berikut sebelum bisa kirim pesan di grup ini:\n\n${notJoinedChannels.map((c) => `📢 ${c.channelTitle}`).join('\n')}\n\nSilakan join channel di bawah, lalu coba kirim pesan lagi.`

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
