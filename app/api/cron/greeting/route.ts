import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Bot from '@/lib/models/Bot'
import Counter from '@/lib/models/Counter'

export const dynamic = 'force-dynamic'

// Determine greeting type based on WIB time (UTC+7)
function getGreetingType(): string {
  const now = new Date()
  const wibHour = (now.getUTCHours() + 7) % 24

  if (wibHour >= 5 && wibHour < 10) return 'pagi'
  if (wibHour >= 10 && wibHour < 15) return 'siang'
  if (wibHour >= 15 && wibHour < 18) return 'sore'
  return 'malam'
}

// 3 variasi teks per waktu - dipilih secara acak setiap kali sapaan dikirim.
const DEFAULT_GREETINGS: Record<string, string[]> = {
  pagi: [
    '🌅 Selamat pagi semuanya! Semoga hari ini penuh berkah dan semangat. 💪',
    '☕ Pagi! Awali harimu dengan senyuman dan semangat baru ya. 😊',
    '🌞 Selamat pagi! Semoga harimu lancar dan menyenangkan. Tetap semangat! 🔥',
  ],
  siang: [
    '☀️ Selamat siang! Jangan lupa istirahat dan makan siang ya. 🍽️',
    '🥗 Siang semuanya! Sudah makan belum? Jangan sampai telat ya. 😋',
    '🌤️ Selamat siang! Semangat terus menjalani aktivitas hari ini. 💼',
  ],
  sore: [
    '🌇 Selamat sore! Semoga aktivitas hari ini berjalan lancar. 🙏',
    '🍵 Sore semuanya! Waktunya rehat sejenak dan ngeteh dulu. ☕',
    '🌆 Selamat sore! Sisa hari ini semoga tetap menyenangkan ya. 😄',
  ],
  malam: [
    '🌙 Selamat malam! Istirahat yang cukup ya, besok semangat lagi. 😴',
    '✨ Malam semuanya! Terima kasih untuk hari ini, selamat beristirahat. 🌟',
    '🌃 Selamat malam! Jangan begadang ya, jaga kesehatan. 💤',
  ],
}

function getDefaultGreeting(type: string): string {
  const list = DEFAULT_GREETINGS[type] || DEFAULT_GREETINGS.pagi
  return list[Math.floor(Math.random() * list.length)]
}

// GET - Called by Vercel cron or external cron service
export async function GET(request: NextRequest) {
  try {
    const greetingType = getGreetingType()
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    await connectDB()

    // Find all bots with greeting feature enabled
    const bots = await Bot.find({
      isActive: true,
      enabledFeatures: 'greeting',
    })

    let sent = 0
    let skipped = 0

    // Track which groups already received greeting today for this time slot
    const sentGroups = new Set<string>()

    for (const bot of bots) {
      // Get the greeting message for current time
      const fieldMap: Record<string, string> = {
        pagi: bot.greetingPagi,
        siang: bot.greetingSiang,
        sore: bot.greetingSore,
        malam: bot.greetingMalam,
      }

      const greetingMessage = fieldMap[greetingType]

      // Skip if disabled
      if (greetingMessage === '__disabled__') continue

      // Custom variations added via the dashboard panel, if any
      const templatesMap: Record<string, string[]> = {
        pagi: bot.greetingTemplatesPagi || [],
        siang: bot.greetingTemplatesSiang || [],
        sore: bot.greetingTemplatesSore || [],
        malam: bot.greetingTemplatesMalam || [],
      }
      const customTemplates = (templatesMap[greetingType] || []).filter((t: string) => t && t.trim())

      // Priority: custom variations (random) -> single custom message -> 3 default variations (random)
      let text: string
      if (customTemplates.length > 0) {
        text = customTemplates[Math.floor(Math.random() * customTemplates.length)]
      } else if (greetingMessage) {
        text = greetingMessage
      } else {
        text = getDefaultGreeting(greetingType)
      }

      // Send to each group (but only ONCE per group per time slot per day)
      for (const group of bot.groups) {
        const groupKey = `greeting_${group.groupId}_${greetingType}_${today}`

        // Skip if this group already got this greeting today
        if (sentGroups.has(group.groupId)) {
          skipped++
          continue
        }

        // Check in database if already sent today
        const existing = await Counter.findOne({ key: groupKey })
        if (existing) {
          sentGroups.add(group.groupId)
          skipped++
          continue
        }

        // Send greeting
        try {
          const res = await fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: group.groupId,
              text,
              parse_mode: 'HTML',
            }),
          })

          const data = await res.json()
          if (data.ok) {
            // Mark as sent in database (prevents duplicate on next call)
            await Counter.findOneAndUpdate(
              { key: groupKey },
              { count: 1, firstMsg: Date.now() },
              { upsert: true }
            )
            sentGroups.add(group.groupId)
            sent++
          }
        } catch (error) {
          console.error(`Failed to send greeting to ${group.groupId}:`, error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      greetingType,
      date: today,
      botCount: bots.length,
      messagesSent: sent,
      messagesSkipped: skipped,
    })
  } catch (error: any) {
    console.error('Cron greeting error:', error?.message)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
