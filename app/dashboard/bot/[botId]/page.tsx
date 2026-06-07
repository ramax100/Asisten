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
  features: string[]
}

const AVAILABLE_FEATURES = [
  { id: 'webhook', name: 'Webhook', desc: 'Aktifkan bot 24 jam' },
  { id: 'force_join', name: 'Force Join Channel', desc: 'Wajibkan member join channel' },
  { id: 'protect_group', name: 'Proteksi Grup', desc: 'Lindungi grup dari user yang belum join' },
]

export default function BotSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const botId = params.botId as string

  const [bot, setBot] = useState<BotDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeFeatures, setActiveFeatures] = useState<string[]>([])
  const [showFeatureMenu, setShowFeatureMenu] = useState(false)

  // Form states
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

  useEffect(() => {
    if (bot) {
      // Auto-show features that already have data
      const features: string[] = []
      if (bot.webhookUrl) features.push('webhook')
      if (bot.channels.length > 0) features.push('force_join')
      if (bot.groups.length > 0) features.push('protect_group')
      setActiveFeatures(features)
    }
  }, [bot])

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

  const addFeature = (featureId: string) => {
    if (!activeFeatures.includes(featureId)) {
      setActiveFeatures([...activeFeatures, featureId])
    }
    setShowFeatureMenu(false)
  }

  const removeFeature = (featureId: string) => {
    setActiveFeatures(activeFeatures.filter(f => f !== featureId))
  }

  // === HANDLERS ===
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
      if (res.ok) { setChannelInput(''); fetchBot() }
      else { setChannelError(data.error || 'Gagal menambahkan channel') }
    } catch (err) { setChannelError('Gagal menghubungi server') }
    finally { setAddingChannel(false) }
  }

  const handleRemoveChannel = async (channelId: string) => {
    try {
      const res = await fetch(`/api/bots/${botId}/channels`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId }),
      })
      if (res.ok) fetchBot()
    } catch (err) { console.error(err) }
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
      if (res.ok) { setGroupInput(''); fetchBot() }
      else { setGroupError(data.error || 'Gagal menambahkan grup') }
    } catch (err) { setGroupError('Gagal menghubungi server') }
    finally { setAddingGroup(false) }
  }

  const handleRemoveGroup = async (groupId: string) => {
    try {
      const res = await fetch(`/api/bots/${botId}/groups`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      })
      if (res.ok) fetchBot()
    } catch (err) { console.error(err) }
  }

  const handleSetupWebhook = async () => {
    setWebhookStatus('loading')
    try {
      const res = await fetch(`/api/bots/${botId}/webhook`, { method: 'POST' })
      if (res.ok) { setWebhookStatus('success'); fetchBot() }
      else { setWebhookStatus('error') }
    } catch (err) { setWebhookStatus('error') }
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

  const unusedFeatures = AVAILABLE_FEATURES.filter(f => !activeFeatures.includes(f.id))

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

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        {/* Active Features */}
        {activeFeatures.includes('webhook') && (
          <section className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-800">Webhook</h2>
              <button onClick={() => removeFeature('webhook')} className="text-xs text-gray-400 hover:text-red-500">Tutup</button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Aktifkan webhook agar bot berjalan 24 jam.
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
        )}

        {activeFeatures.includes('force_join') && (
          <section className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-800">Force Join Channel</h2>
              <button onClick={() => removeFeature('force_join')} className="text-xs text-gray-400 hover:text-red-500">Tutup</button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Member wajib join channel ini sebelum kirim pesan. Bot harus admin di channel.
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

            {bot.channels.length > 0 && (
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
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeFeatures.includes('protect_group') && (
          <section className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-800">Proteksi Grup</h2>
              <button onClick={() => removeFeature('protect_group')} className="text-xs text-gray-400 hover:text-red-500">Tutup</button>
            </div>
            <p className="text-xs text-gray-500 mb-1">
              Bot harus admin di grup dengan izin hapus pesan.
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

            {bot.groups.length > 0 && (
              <div className="space-y-1.5">
                {bot.groups.map((group) => (
                  <div key={group.groupId} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                    <div>
                      <p className="text-sm text-gray-700">{group.groupTitle}</p>
                      <p className="text-xs text-gray-400">{group.groupId}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveGroup(group.groupId)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Empty state / Add Feature Button */}
        {activeFeatures.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500 text-sm mb-1">Belum ada fitur aktif</p>
            <p className="text-gray-400 text-xs">Klik tombol di bawah untuk menambahkan fitur</p>
          </div>
        )}

        {/* Add Feature Button */}
        {unusedFeatures.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowFeatureMenu(!showFeatureMenu)}
              className="w-full py-2.5 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              + Tambah Fitur
            </button>

            {showFeatureMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-10 overflow-hidden">
                {unusedFeatures.map((feature) => (
                  <button
                    key={feature.id}
                    onClick={() => addFeature(feature.id)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <p className="text-sm text-gray-700 font-medium">{feature.name}</p>
                    <p className="text-xs text-gray-400">{feature.desc}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
