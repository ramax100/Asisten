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
    if (!res.ok) {
      router.push('/')
    }
  }

  const fetchBots = async () => {
    try {
      const res = await fetch('/api/bots')
      if (res.ok) {
        const data = await res.json()
        setBots(data.bots)
      }
    } catch (err) {
      console.error('Fetch bots error:', err)
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Telegram Bot Panel</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-gray-400 text-sm">Total Bot</p>
            <p className="text-2xl font-bold text-white mt-1">{bots.length}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-gray-400 text-sm">Bot Aktif</p>
            <p className="text-2xl font-bold text-green-400 mt-1">
              {bots.filter((b) => b.isActive).length}
            </p>
          </div>
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-gray-400 text-sm">Total Channel</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">
              {bots.reduce((acc, b) => acc + b.channels.length, 0)}
            </p>
          </div>
        </div>

        {/* Bot List Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Bot Saya</h2>
          <button
            onClick={() => setShowAddBot(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Tambah Bot
          </button>
        </div>

        {/* Add Bot Modal */}
        {showAddBot && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Tambah Bot Baru</h3>
              <form onSubmit={handleAddBot}>
                <input
                  type="password"
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value)}
                  placeholder="Masukkan token bot dari BotFather"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  required
                />
                {error && (
                  <p className="text-red-400 text-sm mb-3">{error}</p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowAddBot(false); setError('') }}
                    className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    {addLoading ? 'Menambahkan...' : 'Tambah'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bot Cards */}
        {bots.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-700 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-gray-400 mb-2">Belum ada bot</p>
            <p className="text-gray-500 text-sm">Klik "Tambah Bot" untuk menambahkan bot pertama Anda</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bots.map((bot) => (
              <div
                key={bot._id}
                onClick={() => router.push(`/dashboard/bot/${bot.botId}`)}
                className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-blue-500 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {bot.botName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{bot.botName}</p>
                      <p className="text-gray-400 text-sm">@{bot.botUsername}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${bot.isActive ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                    {bot.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-gray-400">
                  <span>{bot.channels.length} Channel</span>
                  <span>{bot.groups.length} Grup</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
