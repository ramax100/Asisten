// Command handler for moderation: /mute, /unmute, /kick, /ban, /unban, /id
//
// Supported ways to target a member:
//   1. Reply pesan member + /mute 1m
//   2. /mute [tag member] 1m   (tag member dari suggestion list — text_mention)
//   3. /mute 123456789 1m      (via user ID langsung)
//
// Command /id: reply pesan member untuk mendapatkan user ID-nya.
//   Berguna agar admin bisa pakai format /mute <userId> di kemudian hari.

export async function handleCommand(message: any, bot: any) {
  const chat = message.chat
  const user = message.from
  const text = message.text || ''

  // Only process in groups
  if (chat.type !== 'group' && chat.type !== 'supergroup') return

  // Parse parts
  const parts = text.split(/\s+/).filter(Boolean)

  // Find the command part (could be parts[0] or parts[1] if mention is first)
  let commandPart = ''
  let commandIndex = -1
  for (let i = 0; i < Math.min(parts.length, 3); i++) {
    const cleaned = parts[i].split('@')[0].toLowerCase()
    if (['/mute', '/unmute', '/kick', '/ban', '/unban', '/id'].includes(cleaned)) {
      commandPart = cleaned
      commandIndex = i
      break
    }
  }

  if (!commandPart || commandIndex === -1) return

  const command = commandPart

  // Multi-bot: only the bot that has the moderation feature enabled responds.
  const features = bot.enabledFeatures || []
  if (!features.includes('moderation')) return

  // === /id COMMAND: get user ID from reply ===
  if (command === '/id') {
    if (message.reply_to_message && message.reply_to_message.from) {
      const target = message.reply_to_message.from
      const name = target.first_name || 'User'
      const uname = target.username ? ` (@${target.username})` : ''
      await sendMsg(
        bot.token,
        chat.id,
        `🆔 <b>${name}</b>${uname}\nUser ID: <code>${target.id}</code>\n\nGunakan ID ini untuk moderasi:\n<code>/mute ${target.id} 1m</code>`
      )
    } else {
      await sendMsg(bot.token, chat.id, '⚠️ Reply pesan member untuk mendapatkan user ID-nya.')
    }
    return
  }

  // === ADMIN CHECK ===
  const isAnonymousAdmin = message.sender_chat && String(message.sender_chat.id) === String(chat.id)

  if (!isAnonymousAdmin) {
    try {
      const adminRes = await fetch(
        `https://api.telegram.org/bot${bot.token}/getChatMember?chat_id=${chat.id}&user_id=${user.id}`
      )
      const adminData = await adminRes.json()
      if (!adminData.ok) return
      const status = adminData.result.status
      if (status !== 'creator' && status !== 'administrator') return
    } catch {
      return
    }
  }

  // === RESOLVE TARGET USER ===
  // Priority: text_mention entity > user ID in text > reply
  let targetUser: any = null
  let extraParts: string[] = [] // remaining parts after command & target (for duration etc.)

  const entities: any[] = message.entities || []

  // Method 1: Find text_mention entity (tag member dari suggestion — includes user object)
  const textMentionEntity = entities.find(
    (e: any) => e.type === 'text_mention' && e.user && e.user.id !== user.id
  )

  // Method 2: Find @username mention entity
  const mentionEntities = entities.filter((e: any) => e.type === 'mention')
  let usernameEntity: any = null
  for (const ent of mentionEntities) {
    const mentionText = text.substring(ent.offset, ent.offset + ent.length)
    const uname = mentionText.replace('@', '')
    // Skip bot's own username (from /mute@BotUsername format)
    if (uname.toLowerCase() === (bot.botUsername || '').toLowerCase()) continue
    usernameEntity = { ...ent, username: uname, rawText: mentionText }
    break
  }

  // Method 3: Find numeric user ID in parts (e.g. /mute 123456789 1m)
  let userIdFromText: string | null = null
  let userIdPartIndex = -1
  for (let i = 0; i < parts.length; i++) {
    if (i === commandIndex) continue
    // A user ID is a numeric string (at least 6 digits, distinguishes from duration like "1m")
    if (/^\d{6,}$/.test(parts[i])) {
      userIdFromText = parts[i]
      userIdPartIndex = i
      break
    }
  }

  if (textMentionEntity && textMentionEntity.user) {
    // text_mention: Telegram provides full user object
    targetUser = textMentionEntity.user
    const mentionRawText = text.substring(textMentionEntity.offset, textMentionEntity.offset + textMentionEntity.length)
    extraParts = parts.filter(
      (p) => p !== mentionRawText && p.split('@')[0].toLowerCase() !== command
    )
  } else if (usernameEntity) {
    // @username mention: try to resolve via getChatMember is not possible without user_id.
    // Inform admin to use reply, text_mention, or /id command.
    await sendMsg(
      bot.token,
      chat.id,
      `⚠️ Tidak bisa resolve <code>@${usernameEntity.username}</code> (limitasi Telegram Bot API).\n\n` +
      `<b>Cara yang didukung:</b>\n` +
      `• <b>Reply</b> pesan member lalu ketik command\n` +
      `• <b>Tag member dari suggestion</b> (ketik nama lalu pilih dari daftar)\n` +
      `• <b>Pakai user ID</b>: <code>/mute 123456789 1m</code>\n` +
      `  → Gunakan <code>/id</code> (reply pesan member) untuk dapatkan ID`
    )
    return
  } else if (userIdFromText) {
    // User ID provided directly — verify the user exists in this chat
    try {
      const memberRes = await fetch(
        `https://api.telegram.org/bot${bot.token}/getChatMember?chat_id=${chat.id}&user_id=${userIdFromText}`
      )
      const memberData = await memberRes.json()
      if (memberData.ok && memberData.result.user) {
        targetUser = memberData.result.user
      } else {
        await sendMsg(bot.token, chat.id, `⚠️ User ID <code>${userIdFromText}</code> tidak ditemukan di grup ini.`)
        return
      }
    } catch {
      await sendMsg(bot.token, chat.id, `⚠️ Gagal memverifikasi user ID <code>${userIdFromText}</code>.`)
      return
    }
    // Extra parts: everything except command and user ID
    extraParts = parts.filter((_, i) => i !== commandIndex && i !== userIdPartIndex)
  } else if (message.reply_to_message && message.reply_to_message.from) {
    // Reply to message: classic method
    targetUser = message.reply_to_message.from
    extraParts = parts.filter((_, i) => i !== commandIndex)
  }

  if (!targetUser) {
    await sendMsg(
      bot.token,
      chat.id,
      '⚠️ Tentukan target member dengan salah satu cara:\n\n' +
      '• <b>Reply</b> pesan member lalu ketik command\n' +
      '• <b>Tag member</b> dari suggestion (ketik nama, pilih dari daftar)\n' +
      '• <b>User ID</b>: <code>/mute 123456789 1m</code>\n' +
      '  → Pakai <code>/id</code> (reply pesan) untuk dapatkan ID member'
    )
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
  const targetUserUsername = targetUser.username ? `@${targetUser.username}` : targetName

  // Render a custom message template with available variables.
  const renderMsg = (tpl: string, duration?: string) =>
    tpl
      .replace(/{mention}/g, targetMention)
      .replace(/{name}/g, targetName)
      .replace(/{username}/g, targetUserUsername)
      .replace(/{id}/g, String(targetUser.id))
      .replace(/{duration}/g, duration || '')

  // Find duration from remaining parts (for /mute command)
  const findDuration = (): string => {
    for (const p of extraParts) {
      if (/^\d+[smhd]$/.test(p)) return p
    }
    // Also check parts after command index
    for (let i = commandIndex + 1; i < parts.length; i++) {
      if (/^\d+[smhd]$/.test(parts[i])) return parts[i]
    }
    return '1h' // default
  }

  if (command === '/mute') {
    const duration = findDuration()
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
      const msg = bot.moderationMuteMessage
        ? renderMsg(bot.moderationMuteMessage, duration)
        : `🔇 ${targetMention} di-mute selama <b>${duration}</b>.`
      await sendMsg(bot.token, chat.id, msg)
    } else if (!isPermissionError(data.description)) {
      console.error('mute failed:', data.description)
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
      const msg = bot.moderationUnmuteMessage
        ? renderMsg(bot.moderationUnmuteMessage)
        : `🔊 ${targetMention} telah di-unmute.`
      await sendMsg(bot.token, chat.id, msg)
    } else if (!isPermissionError(data.description)) {
      console.error('unmute failed:', data.description)
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
      const msg = bot.moderationKickMessage
        ? renderMsg(bot.moderationKickMessage)
        : `👢 ${targetMention} telah di-kick.`
      await sendMsg(bot.token, chat.id, msg)
    } else if (!isPermissionError(banData.description)) {
      console.error('kick failed:', banData.description)
    }

  } else if (command === '/ban') {
    const res = await fetch(`https://api.telegram.org/bot${bot.token}/banChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat.id, user_id: targetUser.id }),
    })

    const data = await res.json()
    if (data.ok) {
      const msg = bot.moderationBanMessage
        ? renderMsg(bot.moderationBanMessage)
        : `🚫 ${targetMention} telah di-ban.`
      await sendMsg(bot.token, chat.id, msg)
    } else if (!isPermissionError(data.description)) {
      console.error('ban failed:', data.description)
    }

  } else if (command === '/unban') {
    const res = await fetch(`https://api.telegram.org/bot${bot.token}/unbanChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat.id, user_id: targetUser.id, only_if_banned: true }),
    })

    const data = await res.json()
    if (data.ok) {
      const msg = bot.moderationUnbanMessage
        ? renderMsg(bot.moderationUnbanMessage)
        : `✅ ${targetMention} telah di-unban.`
      await sendMsg(bot.token, chat.id, msg)
    } else if (!isPermissionError(data.description)) {
      console.error('unban failed:', data.description)
    }
  }
}

// Detects "bot is not admin / lacks permission" errors so we can stay silent.
function isPermissionError(desc?: string): boolean {
  if (!desc) return false
  const d = desc.toLowerCase()
  return (
    d.includes('not enough rights') ||
    d.includes("can't restrict") ||
    d.includes('chat_admin_required') ||
    d.includes('user_admin_invalid') ||
    d.includes('have no rights') ||
    d.includes('method is available') ||
    d.includes("can't remove chat owner")
  )
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
