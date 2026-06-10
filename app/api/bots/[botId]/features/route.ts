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
    const { feature, enabled, message, featureId, text, index } = await request.json()

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
      // Enable anti-spam flag when feature is added
      if (featureId === 'anti_spam') {
        bot.antiSpamEnabled = true
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
    } else if (feature === 'greeting_template_add') {
      // Add a variation: { message: waktu, text }
      const fieldName = `greetingTemplates${message.charAt(0).toUpperCase() + message.slice(1)}`
      if (text && text.trim()) {
        if (!(bot as any)[fieldName]) (bot as any)[fieldName] = []
        ;(bot as any)[fieldName].push(text.trim())
      }
    } else if (feature === 'greeting_template_update') {
      // Update a variation by index: { message: waktu, index, text }
      const fieldName = `greetingTemplates${message.charAt(0).toUpperCase() + message.slice(1)}`
      if ((bot as any)[fieldName] && index >= 0 && index < (bot as any)[fieldName].length && text && text.trim()) {
        ;(bot as any)[fieldName][index] = text.trim()
      }
    } else if (feature === 'greeting_template_remove') {
      // Remove a variation by index: { message: waktu, index }
      const fieldName = `greetingTemplates${message.charAt(0).toUpperCase() + message.slice(1)}`
      if ((bot as any)[fieldName] && index >= 0 && index < (bot as any)[fieldName].length) {
        ;(bot as any)[fieldName].splice(index, 1)
      }
    } else if (feature === 'banned_words') {
      if (message !== undefined) bot.bannedWords = message.split(',').map((w: string) => w.trim()).filter(Boolean)
    } else if (feature === 'banned_words_action') {
      bot.bannedWordsAction = message || 'delete_warn'
    } else if (feature === 'banned_words_message') {
      bot.bannedWordsMessage = message || ''
    } else if (feature === 'anti_spam_settings') {
      const settings = JSON.parse(message || '{}')
      if (settings.limit) bot.antiSpamLimit = settings.limit
      if (settings.interval) bot.antiSpamInterval = settings.interval
      if (settings.muteDuration) bot.antiSpamMuteDuration = settings.muteDuration
      bot.antiSpamEnabled = true
    } else if (feature === 'anti_spam_message') {
      bot.antiSpamMessage = message || ''
    } else if (feature === 'anti_forward_settings') {
      const settings = JSON.parse(message || '{}')
      if (settings.warningLimit) bot.antiForwardWarningLimit = settings.warningLimit
      if (settings.muteDuration) bot.antiForwardMuteDuration = settings.muteDuration
    } else if (feature === 'anti_forward_warning_message') {
      bot.antiForwardWarningMessage = message || ''
    } else if (feature === 'anti_forward_mute_message') {
      bot.antiForwardMuteMessage = message || ''
    } else if (feature === 'moderation_mute_message') {
      bot.moderationMuteMessage = message || ''
    } else if (feature === 'moderation_unmute_message') {
      bot.moderationUnmuteMessage = message || ''
    } else if (feature === 'moderation_kick_message') {
      bot.moderationKickMessage = message || ''
    } else if (feature === 'moderation_ban_message') {
      bot.moderationBanMessage = message || ''
    } else if (feature === 'moderation_unban_message') {
      bot.moderationUnbanMessage = message || ''
    } else if (feature === 'custom_command_add') {
      // Add custom command: { message: JSON { command, response } }
      const cmd = JSON.parse(message || '{}')
      if (cmd.command && cmd.response) {
        if (!bot.customCommands) bot.customCommands = []
        // Remove slash if user includes it
        const cmdName = cmd.command.replace(/^\//, '').toLowerCase().trim()
        // Check duplicate
        const exists = bot.customCommands.find((c: any) => c.command.toLowerCase() === cmdName)
        if (exists) {
          return NextResponse.json({ error: `Command /${cmdName} sudah ada` }, { status: 400 })
        }
        bot.customCommands.push({ command: cmdName, response: cmd.response })
      }
    } else if (feature === 'custom_command_update') {
      // Update command response: { message: JSON { command, response } }
      const cmd = JSON.parse(message || '{}')
      if (cmd.command && cmd.response && bot.customCommands) {
        const cmdName = cmd.command.replace(/^\//, '').toLowerCase().trim()
        const idx = bot.customCommands.findIndex((c: any) => c.command.toLowerCase() === cmdName)
        if (idx >= 0) {
          bot.customCommands[idx].response = cmd.response
        }
      }
    } else if (feature === 'custom_command_delete') {
      // Delete command: { message: command name }
      if (message && bot.customCommands) {
        const cmdName = message.replace(/^\//, '').toLowerCase().trim()
        bot.customCommands = bot.customCommands.filter((c: any) => c.command.toLowerCase() !== cmdName)
      }
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
      bot.greetingTemplatesPagi = []
      bot.greetingTemplatesSiang = []
      bot.greetingTemplatesSore = []
      bot.greetingTemplatesMalam = []
    } else if (feature === 'banned_words') {
      bot.bannedWords = []
      bot.bannedWordsAction = 'delete_warn'
    } else if (feature === 'anti_spam') {
      bot.antiSpamEnabled = false
      bot.antiSpamLimit = 5
      bot.antiSpamInterval = 10
      bot.antiSpamMuteDuration = '5m'
    } else if (feature === 'anti_forward') {
      bot.antiForwardWarningLimit = 3
      bot.antiForwardMuteDuration = '1h'
    } else if (feature === 'moderation') {
      bot.moderationMuteMessage = ''
      bot.moderationUnmuteMessage = ''
      bot.moderationKickMessage = ''
      bot.moderationBanMessage = ''
      bot.moderationUnbanMessage = ''
    } else if (feature === 'custom_commands') {
      bot.customCommands = []
    }

    await bot.save()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete feature error:', error?.message)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
