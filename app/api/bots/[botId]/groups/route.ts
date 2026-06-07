import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'
import connectDB from '@/lib/mongodb'
import Bot from '@/lib/models/Bot'

export const dynamic = 'force-dynamic'

// POST - Add group manually
export async function POST(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { groupId } = await request.json()

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID diperlukan' }, { status: 400 })
    }

    await connectDB()
    const bot = await Bot.findOne({ botId: params.botId })

    if (!bot) {
      return NextResponse.json({ error: 'Bot tidak ditemukan' }, { status: 404 })
    }

    // Verify group exists and bot is member
    const chatRes = await fetch(
      `https://api.telegram.org/bot${bot.token}/getChat?chat_id=${groupId}`
    )
    const chatData = await chatRes.json()

    if (!chatData.ok) {
      return NextResponse.json(
        { error: 'Grup tidak ditemukan. Pastikan bot sudah ditambahkan sebagai admin di grup.' },
        { status: 400 }
      )
    }

    const chat = chatData.result

    if (chat.type !== 'group' && chat.type !== 'supergroup') {
      return NextResponse.json({ error: 'ID yang dimasukkan bukan grup' }, { status: 400 })
    }

    // Check if group already added
    const exists = bot.groups.find((g: any) => g.groupId === String(chat.id))
    if (exists) {
      return NextResponse.json({ error: 'Grup sudah ditambahkan' }, { status: 400 })
    }

    // Check if bot is admin in the group
    const memberRes = await fetch(
      `https://api.telegram.org/bot${bot.token}/getChatMember?chat_id=${chat.id}&user_id=${bot.botId}`
    )
    const memberData = await memberRes.json()

    if (!memberData.ok || memberData.result.status !== 'administrator') {
      return NextResponse.json(
        { error: 'Bot harus menjadi admin di grup ini. Tambahkan bot sebagai admin terlebih dahulu.' },
        { status: 400 }
      )
    }

    // Add group
    bot.groups.push({
      groupId: String(chat.id),
      groupTitle: chat.title,
    })

    await bot.save()

    return NextResponse.json({ success: true, group: bot.groups[bot.groups.length - 1] })
  } catch (error) {
    console.error('Add group error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

// DELETE - Remove group
export async function DELETE(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { groupId } = await request.json()

    await connectDB()
    const bot = await Bot.findOne({ botId: params.botId })

    if (!bot) {
      return NextResponse.json({ error: 'Bot tidak ditemukan' }, { status: 404 })
    }

    bot.groups = bot.groups.filter((g: any) => g.groupId !== groupId)
    await bot.save()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove group error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
