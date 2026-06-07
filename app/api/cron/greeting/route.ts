import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Bot from '@/lib/models/Bot'

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

function getDefaultGreeting(type: string): string {
  const greetings: Record<string, string> = {
    pagi: '🌅 Selamat pagi semuanya! Semoga hari ini penuh berkah dan semangat. 💪',
    siang: '☀️ Selamat siang! Jangan lupa istirahat dan makan siang ya. 🍽️',
    sore: '🌇 Selamat sore! Semoga aktivitas hari ini berjalan lancar. 🙏',
    malam: '🌙 Selamat malam! Istirahat yang cukup ya, besok semangat lagi. 😴',
  }
  return greetings[type] || greetings.pagi
}

// GET - Called by external cron service (cron-job.org)
export async function GET(request: NextRequest) {
  try {
    const greetingType = getGreetingType()

    await connectDB()

    // Find all bots with greeting feature enabled
    const bots = await Bot.find({
      isActive: true,
      enabledFeatures: 'greeting',
    })

    let sent = 0

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

      // Use custom or default message
      const text = greetingMessage || getDefaultGreeting(greetingType)

      // Send to all groups
      for (const group of bot.groups) {
        try {
          await fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: group.groupId,
              text,
              parse_mode: 'HTML',
            }),
          })
          sent++
        } catch (error) {
          console.error(`Failed to send greeting to ${group.groupId}:`, error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      greetingType,
      botCount: bots.length,
      messagesSent: sent,
    })
  } catch (error: any) {
    console.error('Cron greeting error:', error?.message)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
