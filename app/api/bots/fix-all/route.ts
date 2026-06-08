import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Bot from '@/lib/models/Bot'

export const dynamic = 'force-dynamic'

function isAuthenticated(request: NextRequest): boolean {
  return request.cookies.get('auth-token')?.value === 'admin-authenticated'
}

// POST - Fix webhook for ALL bots
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()
    const bots = await Bot.find({ isActive: true })

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://asisten-seven.vercel.app'
    const results = []

    for (const bot of bots) {
      const webhookUrl = `${baseUrl}/api/webhook/${bot.botId}`

      try {
        // Set webhook
        const res = await fetch(`https://api.telegram.org/bot${bot.token}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: webhookUrl,
            allowed_updates: ['message', 'callback_query', 'my_chat_member', 'chat_member'],
          }),
        })
        const data = await res.json()

        if (data.ok) {
          bot.webhookUrl = webhookUrl
          await bot.save()
          results.push({ bot: bot.botName, username: bot.botUsername, status: 'ok', webhook: webhookUrl })
        } else {
          results.push({ bot: bot.botName, username: bot.botUsername, status: 'error', error: data.description })
        }
      } catch (err: any) {
        results.push({ bot: bot.botName, username: bot.botUsername, status: 'error', error: err?.message })
      }
    }

    return NextResponse.json({
      success: true,
      total: bots.length,
      fixed: results.filter(r => r.status === 'ok').length,
      failed: results.filter(r => r.status === 'error').length,
      results,
    })
  } catch (error: any) {
    return NextResponse.json({ error: 'Terjadi kesalahan: ' + (error?.message || 'unknown') }, { status: 500 })
  }
}
