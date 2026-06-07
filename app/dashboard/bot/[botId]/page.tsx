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
  const [addingChannel, setAddingChannel] = useState(false)
  const [webhookStatus, setWebhookStatus] = useState('')
  const [error, setError] = useState('')

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

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddingChannel(true)
    setError('')

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
        setError(data.error || 'Gagal menambahkan channel')
      }
    } catch (err) {
      setError('Gagal menghubungi server')
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

      if (res.ok) {
        fetchBot()
      }
    } catch (err) {
      console.error('Remove channel error:', err)
    }
  }

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
        setError(data.error || 'Gagal setup webhook')
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
          <div>
            <h1 className="text-lg font-bold text-white">{bot.botName}</h1>
            <p className="text-sm text-gray-400">@{bot.botUsername}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Webhook Section */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-2">Webhook</h2>
          <p className="text-gray-400 text-sm mb-4">
            Setup webhook agar bot bisa menerima pesan. Wajib dilakukan setelah deploy.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSetupWebhook}
              disabled={webhookStatus === 'loading'}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {webhookStatus === 'loading' ? 'Mengatur...' : 'Setup Webhook'}
            </button>
            {webhookStatus === 'success' && (
              <span className="text-green-400 text-sm">Webhook berhasil diatur!</span>
            )}
            {webhookStatus === 'error' && (
              <span className="text-red-400 text-sm">Gagal mengatur webhook</span>
            )}
          </div>
          {bot.webhookUrl && (
            <p className="text-xs text-gray-500 mt-2">URL: {bot.webhookUrl}</p>
          )}
        </div>

        {/* Force Join Channels */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-2">Force Join Channel</h2>
          <p className="text-gray-400 text-sm mb-4">
            User harus join channel ini sebelum bisa kirim pesan di grup yang diprotect.
          </p>

          {/* Add Channel Form */}
          <form onSubmit={handleAddChannel} className="flex gap-2 mb-4">
            <input
              type="text"
              value={channelInput}
              onChange={(e) => setChannelInput(e.target.value)}
              placeholder="@username channel (contoh: @channelanda)"
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

          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

          {/* Channel List */}
          {bot.channels.length === 0 ? (
            <p className="text-gray-500 text-sm">Belum ada channel. Tambahkan channel yang wajib di-join.</p>
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

        {/* Groups Info */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-2">Grup yang Diprotect</h2>
          <p className="text-gray-400 text-sm mb-4">
            Grup secara otomatis terdeteksi saat bot ditambahkan sebagai admin di grup.
            Pastikan bot menjadi admin dengan izin hapus pesan.
          </p>

          {bot.groups.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Belum ada grup. Tambahkan bot sebagai admin di grup Telegram Anda.
            </p>
          ) : (
            <div className="space-y-2">
              {bot.groups.map((group) => (
                <div
                  key={group.groupId}
                  className="flex items-center bg-gray-700/50 rounded-lg px-4 py-3"
                >
                  <div>
                    <p className="text-white text-sm font-medium">{group.groupTitle}</p>
                    <p className="text-gray-400 text-xs">ID: {group.groupId}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
