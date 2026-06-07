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
  forceJoinEnabled: boolean
  forceJoinMessage: string
  successMessage: string
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

  // Edit text states
  const [editingText, setEditingText] = useState(false)
  const [editingSuccessText, setEditingSuccessText] = useState(false)
  const [forceJoinMessage, setForceJoinMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [savingText, setSavingText] = useState(false)
  const [savingSuccessText, setSavingSuccessText] = useState(false)

  // Feature toggle states
  const [togglingFeature, setTogglingFeature] = useState('')

  // Confirm delete states
  const [confirmDelete, setConfirmDelete] = useState('')

  useEffect(() => {
    fetchBot()
  }, [botId])

  useEffect(() => {
    if (bot) {
      const features: string[] = []
      if (bot.webhookUrl) features.push('webhook')
      if (bot.channels.length > 0 || bot.forceJoinEnabled !== undefined) features.push('force_join')
      if (bot.groups.length > 0) features.push('protect_group')
      setActiveFeatures(features)
      setForceJoinMessage(bot.forceJoinMessage || '')
      setSuccessMessage(bot.successMessage || '')
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

  // Toggle fitur on/off
  const handleToggleFeature = async (featureId: string, enabled: boolean) => {
    setTogglingFeature(featureId)
    try {
      const res = await fetch(`/api/bots/${botId}/features`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: featureId, enabled }),
      })
      if (res.ok) fetchBot()
    } catch (err) {
      console.error(err)
    } finally {
      setTogglingFeature('')
    }
  }

  // Hapus fitur dan datanya
  const handleDeleteFeature = async (featureId: string) => {
    try {
      const res = await fetch(`/api/bots/${botId}/features`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: featureId }),
      })
      if (res.ok) {
        setActiveFeatures(activeFeatures.filter(f => f !== featureId))
        setConfirmDelete('')
        fetchBot()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Save custom warning message
  const handleSaveMessage = async () => {
    setSavingText(true)
    try {
      const res = await fetch(`/api/bots/${botId}/features`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: 'force_join_message', message: forceJoinMessage }),
      })
      if (res.ok) {
        setEditingText(false)
        fetchBot()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSavingText(false)
    }
  }

  // Save custom success message
  const handleSaveSuccessMessage = async () => {
    setSavingSuccessText(true)
    try {
      const res = await fetch(`/api/bots/${botId}/features`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: 'success_message', message: successMessage }),
      })
      if (res.ok) {
        setEditingSuccessText(false)
        fetchBot()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSavingSuccessText(false)
    }
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

        {/* WEBHOOK */}
        {activeFeatures.includes('webhook') && (
          <section className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-800">Webhook</h2>
              <div className="flex items-center gap-2">
                {confirmDelete === 'webhook' ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-red-500">Yakin hapus?</span>
                    <button onClick={() => handleDeleteFeature('webhook')} className="text-xs text-red-600 font-medium">Ya</button>
                    <button onClick={() => setConfirmDelete('')} className="text-xs text-gray-400">Batal</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete('webhook')} className="text-xs text-red-400 hover:text-red-600">Hapus</button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-3">Aktifkan webhook agar bot berjalan 24 jam.</p>
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
            {bot.webhookUrl && <p className="text-xs text-gray-400 mt-2 break-all">{bot.webhookUrl}</p>}
          </section>
        )}

        {/* FORCE JOIN CHANNEL */}
        {activeFeatures.includes('force_join') && (
          <section className={`bg-white rounded-lg border p-4 ${bot.forceJoinEnabled === false ? 'border-gray-200 opacity-60' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-800">Force Join Channel</h2>
                {bot.forceJoinEnabled === false && (
                  <span className="text-xs bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded">Nonaktif</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Toggle On/Off */}
                <button
                  onClick={() => handleToggleFeature('force_join', bot.forceJoinEnabled === false)}
                  disabled={togglingFeature === 'force_join'}
                  className={`text-xs px-2 py-0.5 rounded transition-colors ${
                    bot.forceJoinEnabled === false
                      ? 'bg-green-50 text-green-600 hover:bg-green-100'
                      : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                  }`}
                >
                  {bot.forceJoinEnabled === false ? 'Aktifkan' : 'Matikan'}
                </button>
                {/* Edit Text */}
                <button onClick={() => { setEditingText(!editingText); setEditingSuccessText(false) }} className="text-xs text-blue-500 hover:text-blue-700">
                  Edit Teks
                </button>
                {/* Edit Success Text */}
                <button onClick={() => { setEditingSuccessText(!editingSuccessText); setEditingText(false) }} className="text-xs text-green-500 hover:text-green-700">
                  Pesan Sukses
                </button>
                {/* Delete */}
                {confirmDelete === 'force_join' ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-red-500">Yakin?</span>
                    <button onClick={() => handleDeleteFeature('force_join')} className="text-xs text-red-600 font-medium">Ya</button>
                    <button onClick={() => setConfirmDelete('')} className="text-xs text-gray-400">Batal</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete('force_join')} className="text-xs text-red-400 hover:text-red-600">Hapus</button>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-3">Member wajib join channel sebelum kirim pesan di grup.</p>

            {/* Edit Text Area */}
            {editingText && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <label className="block text-xs text-gray-600 mb-1 font-medium">Pesan Warning (HTML supported):</label>
                <textarea
                  value={forceJoinMessage}
                  onChange={(e) => setForceJoinMessage(e.target.value)}
                  placeholder="⚠️ {user}, kamu harus join channel berikut sebelum bisa kirim pesan:&#10;&#10;{channels}&#10;&#10;Silakan join, lalu coba lagi."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">Variabel: {'{mention}'} = tag mention, {'{name}'} = nama, {'{username}'} = username, {'{id}'} = user ID, {'{channels}'} = daftar channel</p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSaveMessage}
                    disabled={savingText}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs rounded transition-colors"
                  >
                    {savingText ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  <button
                    onClick={() => setEditingText(false)}
                    className="px-3 py-1 text-xs text-gray-500 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {/* Edit Success Message Area */}
            {editingSuccessText && (
              <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <label className="block text-xs text-gray-600 mb-1 font-medium">Pesan Sukses (setelah member join):</label>
                <textarea
                  value={successMessage}
                  onChange={(e) => setSuccessMessage(e.target.value)}
                  placeholder="✅ {user}, terima kasih sudah join! Sekarang kamu bisa kirim pesan di grup ini."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-green-500 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">Variabel: {'{mention}'} = tag mention, {'{name}'} = nama, {'{username}'} = username, {'{id}'} = user ID</p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSaveSuccessMessage}
                    disabled={savingSuccessText}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-xs rounded transition-colors"
                  >
                    {savingSuccessText ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  <button
                    onClick={() => setEditingSuccessText(false)}
                    className="px-3 py-1 text-xs text-gray-500 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {bot.forceJoinEnabled !== false && (
              <>
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
                        <button onClick={() => handleRemoveChannel(channel.channelId)} className="text-xs text-red-500 hover:text-red-700">Hapus</button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* PROTECT GROUP */}
        {activeFeatures.includes('protect_group') && (
          <section className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-800">Proteksi Grup</h2>
              <div className="flex items-center gap-2">
                {confirmDelete === 'protect_group' ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-red-500">Yakin?</span>
                    <button onClick={() => handleDeleteFeature('protect_group')} className="text-xs text-red-600 font-medium">Ya</button>
                    <button onClick={() => setConfirmDelete('')} className="text-xs text-gray-400">Batal</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete('protect_group')} className="text-xs text-red-400 hover:text-red-600">Hapus</button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-1">Bot harus admin di grup dengan izin hapus pesan.</p>
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
                    <button onClick={() => handleRemoveGroup(group.groupId)} className="text-xs text-red-500 hover:text-red-700">Hapus</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Empty state */}
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
