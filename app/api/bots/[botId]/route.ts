import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { sessionOptions, SessionData } from '@/lib/session'
import connectDB from '@/lib/mongodb'
import Bot from '@/lib/models/Bot'

export async function GET(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const bot = await Bot.findOne({
    botId: params.botId,
    ownerId: session.botId,
  }).select('-token')

  if (!bot) {
    return NextResponse.json({ error: 'Bot tidak ditemukan' }, { status: 404 })
  }

  return NextResponse.json({ bot })
}
