'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface BotInfo {
  _id: string
  botId: string
  botUsername: string
  botName: string
  channels: { channelId: string; channelUsername: string; channelTitle: string }[]
  groups: { groupId: string; groupTitle: string }[]
  isActive: boolean
  webhookUrl: string
}

export default function DashboardPage() {
  const [bots, setBots] = useState<BotInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddBot, setShowAddBot] = useState(false)
  const [newToken, setNewToken] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    checkSession()
    fetchBots()
  }, [])

  const checkSession = async () => {
    const res = await fetch('/api/auth/session')
    if (!res.ok) router.push('/')
  }

  const fetchBots = async () => {
    try {
      const res = await fetch('/api/bots')
      if (res.ok) {
        const data = await res.json()
        setBots(data.bots)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBot = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddLoading(true)
    setError('')

    try {
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: newToken }),
      })
      const data = await res.json()
      if (res.ok) {
        setShowAddBot(false)
        setNewToken('')
        fetchBots()
      } else {
        setError(data.error || 'Gagal menambahkan bot')
      }
    } catch (err) {
      setError('Gagal menghubungi server')
    } finally {
      setAddLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-base font-bold text-slate-800">Bot Panel</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-slate-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
          >
            Keluar
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
              <p className="text-xs text-slate-500">Total Bot</p>
            </div>
            <p className="text-2xl font-bold text-slate-800">{bots.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              </div>
              <p className="text-xs text-slate-500">Aktif</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{bots.filter((b) => b.isActive).length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
              </div>
              <p className="text-xs text-slate-500">Channel</p>
            </div>
            <p className="text-2xl font-bold text-indigo-600">{bots.reduce((acc, b) => acc + b.channels.length, 0)}</p>
          </div>
        </div>

        {/* Bot List Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Daftar Bot</h2>
          <button
            onClick={() => setShowAddBot(true)}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
          >
            + Tambah Bot
          </button>
        </div>

        {/* Add Bot Modal */}
        {showAddBot && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-slate-200 shadow-xl">
              <h3 className="text-sm font-bold text-slate-800 mb-1">Tambah Bot Baru</h3>
              <p className="text-xs text-slate-500 mb-4">Paste token dari @BotFather di Telegram</p>
              <form onSubmit={handleAddBot}>
                <input
                  type="text"
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value)}
                  placeholder="123456789:ABCdefGHI..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-3"
                  required
                />
                {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowAddBot(false); setError('') }}
                    className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="flex-1 py-2.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-xl transition-colors"
                  >
                    {addLoading ? 'Memproses...' : 'Tambah'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bot List */}
        {bots.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center shadow-sm">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-100 rounded-xl mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-slate-600 text-sm font-medium">Belum ada bot</p>
            <p className="text-slate-400 text-xs mt-1">Klik "Tambah Bot" untuk memulai</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bots.map((bot) => (
              <div
                key={bot._id}
                onClick={() => router.push(`/dashboard/bot/${bot.botId}`)}
                className="bg-white rounded-xl p-4 border border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                    <span className="text-white font-bold text-sm">
                      {bot.botName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800 truncate">{bot.botName}</p>
                      <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        bot.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                      }`}>
                        {bot.isActive ? 'Aktif' : 'Off'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">@{bot.botUsername}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-400">
                      {bot.channels.length} ch &middot; {bot.groups.length} gr
                    </p>
                    <div className="flex items-center gap-1 mt-1 justify-end">
                      {bot.webhookUrl && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Webhook aktif"></div>
                      )}
                      <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
