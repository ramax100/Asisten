'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface Channel {
  channelId: string
  channelUsername: string
  channelTitle: string
}

interface Group {
  groupId: string
  groupTitle: string
}

interface BotDetail {
  botId: string
  botUsername: string
  botName: string
  channels: Channel[]
  groups: Group[]
  isActive: boolean
  webhookUrl: string
}

export default function BotSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const botId = params.botId as string

  const [bot, setBot] = useState<BotDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [channelInput, setChannelInput] = useState('')
  const [groupInput, setGroupInput] = useState('')
  const [addingChannel, setAddingChannel] = useState(false)
  const [addingGroup, setAddingGroup] = useState(false)
  const [webhookStatus, setWebhookStatus] = useState('')
  const [channelError, setChannelError] = useState('')
  const [groupError, setGroupError] = useState('')

  useEffect(() => {
    fetchBot()
  }, [botId])

  const fetchBot = async () => {
    try {
      const res = await fetch(`/api/bots/${botId}`)
      if (res.ok) {
        const data = await res.json()
        setBot(data.bot)
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  // === CHANNEL HANDLERS ===
  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddingChannel(true)
    setChannelError('')

    try {
      const res = await fetch(`/api/bots/${botId}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUsername: channelInput }),
      })

      const data = await res.json()

      if (res.ok) {
        setChannelInput('')
        fetchBot()
      } else {
        setChannelError(data.error || 'Gagal menambahkan channel')
      }
    } catch (err) {
      setChannelError('Gagal menghubungi server')
    } finally {
      setAddingChannel(false)
    }
  }

  const handleRemoveChannel = async (channelId: string) => {
    try {
      const res = await fetch(`/api/bots/${botId}/channels`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId }),
      })
      if (res.ok) fetchBot()
    } catch (err) {
      console.error('Remove channel error:', err)
    }
  }

  // === GROUP HANDLERS ===
  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddingGroup(true)
    setGroupError('')

    try {
      const res = await fetch(`/api/bots/${botId}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: groupInput }),
      })

      const data = await res.json()

      if (res.ok) {
        setGroupInput('')
        fetchBot()
      } else {
        setGroupError(data.error || 'Gagal menambahkan grup')
      }
    } catch (err) {
      setGroupError('Gagal menghubungi server')
    } finally {
      setAddingGroup(false)
    }
  }

  const handleRemoveGroup = async (groupId: string) => {
    try {
      const res = await fetch(`/api/bots/${botId}/groups`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      })
      if (res.ok) fetchBot()
    } catch (err) {
      console.error('Remove group error:', err)
    }
  }

  // === WEBHOOK HANDLER ===
  const handleSetupWebhook = async () => {
    setWebhookStatus('loading')
    try {
      const res = await fetch(`/api/bots/${botId}/webhook`, {
        method: 'POST',
      })

      const data = await res.json()

      if (res.ok) {
        setWebhookStatus('success')
        fetchBot()
      } else {
        setWebhookStatus('error')
      }
    } catch (err) {
      setWebhookStatus('error')
    }

    setTimeout(() => setWebhookStatus(''), 3000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!bot) return null

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">{bot.botName}</h1>
            <p className="text-sm text-gray-400">@{bot.botUsername}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${bot.isActive ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
            {bot.isActive ? 'Aktif' : 'Nonaktif'}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* STEP 1: Webhook */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
            <h2 className="text-lg font-semibold text-white">Aktifkan Webhook</h2>
          </div>
          <p className="text-gray-400 text-sm mb-4 ml-10">
            Klik tombol di bawah untuk menghubungkan bot ke server. Bot akan online 24 jam setelah webhook aktif.
          </p>
          <div className="ml-10 flex items-center gap-3">
            <button
              onClick={handleSetupWebhook}
              disabled={webhookStatus === 'loading'}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {webhookStatus === 'loading' ? 'Mengatur...' : bot.webhookUrl ? 'Update Webhook' : 'Setup Webhook'}
            </button>
            {webhookStatus === 'success' && (
              <span className="text-green-400 text-sm">Berhasil!</span>
            )}
            {webhookStatus === 'error' && (
              <span className="text-red-400 text-sm">Gagal. Pastikan NEXT_PUBLIC_BASE_URL sudah diisi.</span>
            )}
          </div>
          {bot.webhookUrl && (
            <p className="text-xs text-green-400/70 mt-3 ml-10">Aktif: {bot.webhookUrl}</p>
          )}
        </div>

        {/* STEP 2: Channel */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold">2</span>
            <h2 className="text-lg font-semibold text-white">Sambungkan Channel</h2>
          </div>
          <p className="text-gray-400 text-sm mb-4 ml-10">
            Tambahkan channel yang wajib di-join oleh member. Bot harus menjadi admin di channel ini.
          </p>

          {/* Add Channel Form */}
          <form onSubmit={handleAddChannel} className="flex gap-2 mb-4 ml-10">
            <input
              type="text"
              value={channelInput}
              onChange={(e) => setChannelInput(e.target.value)}
              placeholder="@usernamechannel"
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              disabled={addingChannel}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              {addingChannel ? '...' : 'Tambah'}
            </button>
          </form>

          {channelError && <p className="text-red-400 text-sm mb-3 ml-10">{channelError}</p>}

          {/* Channel List */}
          <div className="ml-10">
            {bot.channels.length === 0 ? (
              <p className="text-gray-500 text-sm">Belum ada channel.</p>
            ) : (
              <div className="space-y-2">
                {bot.channels.map((channel) => (
                  <div
                    key={channel.channelId}
                    className="flex items-center justify-between bg-gray-700/50 rounded-lg px-4 py-3"
                  >
                    <div>
                      <p className="text-white text-sm font-medium">{channel.channelTitle}</p>
                      <p className="text-gray-400 text-xs">
                        {channel.channelUsername ? `@${channel.channelUsername}` : `ID: ${channel.channelId}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveChannel(channel.channelId)}
                      className="text-red-400 hover:text-red-300 text-sm transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* STEP 3: Group */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold">3</span>
            <h2 className="text-lg font-semibold text-white">Sambungkan Grup</h2>
          </div>
          <p className="text-gray-400 text-sm mb-2 ml-10">
            Tambahkan grup yang ingin diprotect. Bot harus menjadi admin di grup dengan izin <b>hapus pesan</b>.
          </p>
          <p className="text-gray-500 text-xs mb-4 ml-10">
            Cara mendapatkan Group ID: Tambahkan bot <a href="https://t.me/getidsbot" target="_blank" className="text-blue-400 hover:underline">@getidsbot</a> ke grup, lalu copy ID-nya (contoh: -1001234567890)
          </p>

          {/* Add Group Form */}
          <form onSubmit={handleAddGroup} className="flex gap-2 mb-4 ml-10">
            <input
              type="text"
              value={groupInput}
              onChange={(e) => setGroupInput(e.target.value)}
              placeholder="Group ID (contoh: -1001234567890)"
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              disabled={addingGroup}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              {addingGroup ? '...' : 'Tambah'}
            </button>
          </form>

          {groupError && <p className="text-red-400 text-sm mb-3 ml-10">{groupError}</p>}

          {/* Group List */}
          <div className="ml-10">
            {bot.groups.length === 0 ? (
              <p className="text-gray-500 text-sm">Belum ada grup. Grup juga bisa terdeteksi otomatis saat bot ditambahkan sebagai admin.</p>
            ) : (
              <div className="space-y-2">
                {bot.groups.map((group) => (
                  <div
                    key={group.groupId}
                    className="flex items-center justify-between bg-gray-700/50 rounded-lg px-4 py-3"
                  >
                    <div>
                      <p className="text-white text-sm font-medium">{group.groupTitle}</p>
                      <p className="text-gray-400 text-xs">ID: {group.groupId}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveGroup(group.groupId)}
                      className="text-red-400 hover:text-red-300 text-sm transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-900/20 rounded-xl p-6 border border-blue-800/50">
          <h3 className="text-blue-300 font-semibold mb-3">Cara Kerja Force Join:</h3>
          <ol className="text-blue-200/80 text-sm space-y-2 list-decimal list-inside">
            <li>Member kirim pesan di grup yang diprotect</li>
            <li>Bot cek apakah member sudah join semua channel wajib</li>
            <li>Jika belum join → pesan dihapus + warning muncul dengan tombol "Join Channel"</li>
            <li>Member klik join → klik "Sudah Join" → bot verifikasi</li>
            <li>Jika sudah join semua channel → member bisa kirim pesan normal</li>
          </ol>
        </div>
      </main>
    </div>
  )
}
