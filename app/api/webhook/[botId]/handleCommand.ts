// Command handler for moderation: /mute, /unmute, /kick, /ban, /unban

export async function handleCommand(message: any, bot: any) {
  const chat = message.chat
  const user = message.from
  const text = message.text || ''

  // Only process in groups
  if (chat.type !== 'group' && chat.type !== 'supergroup') return

  // Parse command
  const parts = text.split(' ')
  const command = parts[0].split('@')[0].toLowerCase()

  // Only handle known commands
  if (!['/mute', '/unmute', '/kick', '/ban', '/unban'].includes(command)) return

  // === ADMIN CHECK (re-enabled) ===
  // Allow if: anonymous admin OR creator OR administrator
  const isAnonymousAdmin = message.sender_chat && String(message.sender_chat.id) === String(chat.id)

  if (!isAnonymousAdmin) {
    // Check regular admin status via Telegram API
    try {
      const adminRes = await fetch(
        `https://api.telegram.org/bot${bot.token}/getChatMember?chat_id=${chat.id}&user_id=${user.id}`
      )
      const adminData = await adminRes.json()
      if (!adminData.ok) {
        return // Can't verify, skip
      }
      const status = adminData.result.status
      if (status !== 'creator' && status !== 'administrator') {
        // NOT admin - ignore command
        return
      }
    } catch {
      return
    }
  }

  // Get target user (from reply)
  const replyMsg = message.reply_to_message
  if (!replyMsg) {
    await sendMsg(bot.token, chat.id, '⚠️ Reply pesan member yang ingin di-action.')
    return
  }

  const targetUser = replyMsg.from
  if (!targetUser) {
    await sendMsg(bot.token, chat.id, '⚠️ Tidak bisa membaca user dari pesan tersebut.')
    return
  }

  if (targetUser.is_bot) {
    await sendMsg(bot.token, chat.id, '❌ Tidak bisa action pada bot.')
    return
  }

  // Don't allow action on other admins
  try {
    const targetRes = await fetch(
      `https://api.telegram.org/bot${bot.token}/getChatMember?chat_id=${chat.id}&user_id=${targetUser.id}`
    )
    const targetData = await targetRes.json()
    if (targetData.ok) {
      const ts = targetData.result.status
      if (ts === 'creator' || ts === 'administrator') {
        await sendMsg(bot.token, chat.id, '❌ Tidak bisa action pada admin.')
        return
      }
    }
  } catch {}

  const targetName = targetUser.first_name || 'User'
  const targetMention = `<a href="tg://user?id=${targetUser.id}">${targetName}</a>`

  if (command === '/mute') {
    const duration = parts[1] || '1h'
    const seconds = parseDuration(duration)

    if (!seconds) {
      await sendMsg(bot.token, chat.id, '⚠️ Format: /mute 30s, /mute 5m, /mute 1h, /mute 1d')
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
      await sendMsg(bot.token, chat.id, `🔇 ${targetMention} di-mute selama <b>${duration}</b>.`)
    } else {
      await sendMsg(bot.token, chat.id, `❌ Gagal mute: ${data.description}`)
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
      await sendMsg(bot.token, chat.id, `🔊 ${targetMention} telah di-unmute.`)
    } else {
      await sendMsg(bot.token, chat.id, `❌ Gagal unmute: ${data.description}`)
    }

  } else if (command === '/kick') {
    const banRes = await fetch(`https://api.telegram.org/bot${bot.token}/banChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat.id, user_id: targetUser.id }),
    })
    const banData = await banRes.json()

    if (banData.ok) {
      await fetch(`https://api.telegram.org/bot${bot.token}/unbanChatMember`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat.id, user_id: targetUser.id, only_if_banned: true }),
      })
      await sendMsg(bot.token, chat.id, `👢 ${targetMention} telah di-kick.`)
    } else {
      await sendMsg(bot.token, chat.id, `❌ Gagal kick: ${banData.description}`)
    }

  } else if (command === '/ban') {
    const res = await fetch(`https://api.telegram.org/bot${bot.token}/banChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat.id, user_id: targetUser.id }),
    })

    const data = await res.json()
    if (data.ok) {
      await sendMsg(bot.token, chat.id, `🚫 ${targetMention} telah di-ban.`)
    } else {
      await sendMsg(bot.token, chat.id, `❌ Gagal ban: ${data.description}`)
    }

  } else if (command === '/unban') {
    const res = await fetch(`https://api.telegram.org/bot${bot.token}/unbanChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat.id, user_id: targetUser.id, only_if_banned: true }),
    })

    const data = await res.json()
    if (data.ok) {
      await sendMsg(bot.token, chat.id, `✅ ${targetMention} telah di-unban.`)
    } else {
      await sendMsg(bot.token, chat.id, `❌ Gagal unban: ${data.description}`)
    }
  }
}

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

async function sendMsg(token: string, chatId: number, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
  } catch (error) {
    console.error('Send message error:', error)
  }
}
