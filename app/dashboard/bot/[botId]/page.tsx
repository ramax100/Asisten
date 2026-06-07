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
      console.error(err)
    }
  }

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
      console.error(err)
    }
  }

  const handleSetupWebhook = async () => {
    setWebhookStatus('loading')
    try {
      const res = await fetch(`/api/bots/${botId}/webhook`, { method: 'POST' })
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Memuat...</p>
      </div>
    )
  }

  if (!bot) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            &larr;
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-gray-800">{bot.botName}</h1>
            <p className="text-xs text-gray-500">@{bot.botUsername}</p>
          </div>
          <span className={`px-2 py-0.5 rounded text-xs ${bot.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
            {bot.isActive ? 'Aktif' : 'Nonaktif'}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* Webhook */}
        <section className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-1">Webhook</h2>
          <p className="text-xs text-gray-500 mb-3">
            Aktifkan webhook agar bot menerima pesan dan berjalan 24 jam.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSetupWebhook}
              disabled={webhookStatus === 'loading'}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-xs font-medium rounded transition-colors"
            >
              {webhookStatus === 'loading' ? 'Mengatur...' : bot.webhookUrl ? 'Update Webhook' : 'Setup Webhook'}
            </button>
            {webhookStatus === 'success' && <span className="text-green-600 text-xs">Berhasil!</span>}
            {webhookStatus === 'error' && <span className="text-red-500 text-xs">Gagal</span>}
          </div>
          {bot.webhookUrl && (
            <p className="text-xs text-gray-400 mt-2 break-all">{bot.webhookUrl}</p>
          )}
        </section>

        {/* Force Join Channel */}
        <section className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-1">Force Join Channel</h2>
          <p className="text-xs text-gray-500 mb-3">
            Member wajib join channel ini sebelum bisa kirim pesan di grup. Bot harus admin di channel.
          </p>

          <form onSubmit={handleAddChannel} className="flex gap-2 mb-3">
            <input
              type="text"
              value={channelInput}
              onChange={(e) => setChannelInput(e.target.value)}
              placeholder="@usernamechannel"
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
              required
            />
            <button
              type="submit"
              disabled={addingChannel}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs font-medium rounded transition-colors"
            >
              {addingChannel ? '...' : 'Tambah'}
            </button>
          </form>

          {channelError && <p className="text-red-500 text-xs mb-2">{channelError}</p>}

          {bot.channels.length === 0 ? (
            <p className="text-xs text-gray-400">Belum ada channel.</p>
          ) : (
            <div className="space-y-1.5">
              {bot.channels.map((channel) => (
                <div key={channel.channelId} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                  <div>
                    <p className="text-sm text-gray-700">{channel.channelTitle}</p>
                    <p className="text-xs text-gray-400">
                      {channel.channelUsername ? `@${channel.channelUsername}` : channel.channelId}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveChannel(channel.channelId)}
                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Groups */}
        <section className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-1">Grup yang Diprotect</h2>
          <p className="text-xs text-gray-500 mb-1">
            Tambahkan grup yang ingin diprotect. Bot harus admin dengan izin hapus pesan.
          </p>
          <p className="text-xs text-gray-400 mb-3">
            Dapatkan Group ID dari <a href="https://t.me/getidsbot" target="_blank" className="text-blue-500 hover:underline">@getidsbot</a>
          </p>

          <form onSubmit={handleAddGroup} className="flex gap-2 mb-3">
            <input
              type="text"
              value={groupInput}
              onChange={(e) => setGroupInput(e.target.value)}
              placeholder="-1001234567890"
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
              required
            />
            <button
              type="submit"
              disabled={addingGroup}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs font-medium rounded transition-colors"
            >
              {addingGroup ? '...' : 'Tambah'}
            </button>
          </form>

          {groupError && <p className="text-red-500 text-xs mb-2">{groupError}</p>}

          {bot.groups.length === 0 ? (
            <p className="text-xs text-gray-400">Belum ada grup. Grup juga terdeteksi otomatis saat bot jadi admin.</p>
          ) : (
            <div className="space-y-1.5">
              {bot.groups.map((group) => (
                <div key={group.groupId} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                  <div>
                    <p className="text-sm text-gray-700">{group.groupTitle}</p>
                    <p className="text-xs text-gray-400">{group.groupId}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveGroup(group.groupId)}
                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
