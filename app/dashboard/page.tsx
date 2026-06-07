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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Memuat...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">Bot Panel</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <p className="text-2xl font-bold text-gray-800">{bots.length}</p>
            <p className="text-xs text-gray-500 mt-1">Total Bot</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <p className="text-2xl font-bold text-green-600">
              {bots.filter((b) => b.isActive).length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Aktif</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {bots.reduce((acc, b) => acc + b.channels.length, 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Channel</p>
          </div>
        </div>

        {/* Bot List */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Daftar Bot</h2>
          <button
            onClick={() => setShowAddBot(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
          >
            + Tambah Bot
          </button>
        </div>

        {/* Add Bot Modal */}
        {showAddBot && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-lg p-5 w-full max-w-sm border border-gray-200 shadow-lg">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Tambah Bot Baru</h3>
              <form onSubmit={handleAddBot}>
                <input
                  type="text"
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value)}
                  placeholder="Paste token dari BotFather"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 mb-3"
                  required
                />
                {error && (
                  <p className="text-red-500 text-xs mb-3">{error}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowAddBot(false); setError('') }}
                    className="flex-1 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="flex-1 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 rounded transition-colors"
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
          <div className="bg-white rounded-lg p-8 border border-gray-200 text-center">
            <p className="text-gray-500 text-sm">Belum ada bot.</p>
            <p className="text-gray-400 text-xs mt-1">Klik "Tambah Bot" untuk memulai</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bots.map((bot) => (
              <div
                key={bot._id}
                onClick={() => router.push(`/dashboard/bot/${bot.botId}`)}
                className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-400 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{bot.botName}</p>
                    <p className="text-xs text-gray-500">@{bot.botUsername}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${bot.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                      {bot.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {bot.channels.length} channel &middot; {bot.groups.length} grup
                    </p>
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
