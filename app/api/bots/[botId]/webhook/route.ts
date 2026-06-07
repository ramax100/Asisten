import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'
import connectDB from '@/lib/mongodb'
import Bot from '@/lib/models/Bot'

// POST - Setup webhook for a bot
export async function POST(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()
    const bot = await Bot.findOne({ botId: params.botId, ownerId: session.botId })

    if (!bot) {
      return NextResponse.json({ error: 'Bot tidak ditemukan' }, { status: 404 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_BASE_URL belum dikonfigurasi' },
        { status: 500 }
      )
    }

    const webhookUrl = `${baseUrl}/api/webhook/${bot.botId}`

    // Set webhook on Telegram
    const res = await fetch(`https://api.telegram.org/bot${bot.token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query', 'my_chat_member'],
      }),
    })

    const data = await res.json()

    if (!data.ok) {
      return NextResponse.json(
        { error: `Gagal set webhook: ${data.description}` },
        { status: 400 }
      )
    }

    // Save webhook URL to database
    bot.webhookUrl = webhookUrl
    await bot.save()

    return NextResponse.json({ success: true, webhookUrl })
  } catch (error) {
    console.error('Setup webhook error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

// DELETE - Remove webhook
export async function DELETE(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()
    const bot = await Bot.findOne({ botId: params.botId, ownerId: session.botId })

    if (!bot) {
      return NextResponse.json({ error: 'Bot tidak ditemukan' }, { status: 404 })
    }

    // Delete webhook on Telegram
    await fetch(`https://api.telegram.org/bot${bot.token}/deleteWebhook`)

    bot.webhookUrl = ''
    await bot.save()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete webhook error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
