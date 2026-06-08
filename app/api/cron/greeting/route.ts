import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Bot from '@/lib/models/Bot'
import GreetingDedup from '@/lib/models/GreetingDedup'
import { getGreetingSlot, getWibDateKey, resolveGreetingText, greetingDedupKey } from '@/lib/greetings'

export const dynamic = 'force-dynamic'

// Reserve a greeting send atomically. Returns true if THIS call reserved it
// (so it should send), false if it was already reserved (skip - avoids dupes).
async function reserveGreeting(key: string): Promise<boolean> {
  try {
    const existing = await GreetingDedup.findOneAndUpdate(
      { key },
      { $setOnInsert: { key, date: new Date() } },
      { upsert: true, new: false }
    )
    return !existing
  } catch {
    return false
  }
}

// GET - Called by Vercel cron or external cron service (e.g. cron-job.org hourly)
export async function GET(request: NextRequest) {
  try {
    const slot = getGreetingSlot()
    const today = getWibDateKey()

    await connectDB()

    const bots = await Bot.find({ isActive: true, enabledFeatures: 'greeting' })

    let sent = 0
    let skipped = 0

    for (const bot of bots) {
      const text = resolveGreetingText(bot, slot)
      if (text === null) continue // slot disabled

      for (const group of bot.groups) {
        const key = greetingDedupKey(group.groupId, slot, today)

        // Reserve first to prevent duplicate sends across concurrent calls.
        const reserved = await reserveGreeting(key)
        if (!reserved) {
          skipped++
          continue
        }

        try {
          const res = await fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: group.groupId, text, parse_mode: 'HTML' }),
          })
          const data = await res.json()
          if (data.ok) {
            sent++
          } else {
            // Send failed -> release reservation so it can retry on next call.
            await GreetingDedup.deleteOne({ key })
          }
        } catch (error) {
          await GreetingDedup.deleteOne({ key })
          console.error(`Failed to send greeting to ${group.groupId}:`, error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      greetingType: slot,
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
