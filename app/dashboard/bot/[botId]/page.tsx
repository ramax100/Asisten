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
  { id: 'webhook', name: 'Webhook', desc: 'Aktifkan bot 24 jam', icon: '🌐' },
  { id: 'force_join', name: 'Force Join Channel', desc: 'Wajibkan member join channel', icon: '🔒' },
  { id: 'protect_group', name: 'Proteksi Grup', desc: 'Lindungi grup dari user yang belum join', icon: '🛡' },
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

  // Feature toggle/delete
  const [togglingFeature, setTogglingFeature] = useState('')
  const [confirmDelete, setConfirmDelete] = useState('')

  useEffect(() => { fetchBot() }, [botId])

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
      if (res.ok) { const data = await res.json(); setBot(data.bot) }
      else { router.push('/dashboard') }
    } catch (err) { router.push('/dashboard') }
    finally { setLoading(false) }
  }

  const addFeature = (featureId: string) => {
    if (!activeFeatures.includes(featureId)) setActiveFeatures([...activeFeatures, featureId])
    setShowFeatureMenu(false)
  }

  const handleToggleFeature = async (featureId: string, enabled: boolean) => {
    setTogglingFeature(featureId)
    try {
      const res = await fetch(`/api/bots/${botId}/features`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: featureId, enabled }),
      })
      if (res.ok) fetchBot()
    } catch (err) { console.error(err) }
    finally { setTogglingFeature('') }
  }

  const handleDeleteFeature = async (featureId: string) => {
    try {
      const res = await fetch(`/api/bots/${botId}/features`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: featureId }),
      })
      if (res.ok) { setActiveFeatures(activeFeatures.filter(f => f !== featureId)); setConfirmDelete(''); fetchBot() }
    } catch (err) { console.error(err) }
  }

  const handleSaveMessage = async () => {
    setSavingText(true)
    try {
      const res = await fetch(`/api/bots/${botId}/features`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: 'force_join_message', message: forceJoinMessage }),
      })
      if (res.ok) { setEditingText(false); fetchBot() }
    } catch (err) { console.error(err) }
    finally { setSavingText(false) }
  }

  const handleSaveSuccessMessage = async () => {
    setSavingSuccessText(true)
    try {
      const res = await fetch(`/api/bots/${botId}/features`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: 'success_message', message: successMessage }),
      })
      if (res.ok) { setEditingSuccessText(false); fetchBot() }
    } catch (err) { console.error(err) }
    finally { setSavingSuccessText(false) }
  }

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault(); setAddingChannel(true); setChannelError('')
    try {
      const res = await fetch(`/api/bots/${botId}/channels`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channelUsername: channelInput }) })
      const data = await res.json()
      if (res.ok) { setChannelInput(''); fetchBot() } else { setChannelError(data.error || 'Gagal') }
    } catch (err) { setChannelError('Gagal menghubungi server') }
    finally { setAddingChannel(false) }
  }

  const handleRemoveChannel = async (channelId: string) => {
    try { const res = await fetch(`/api/bots/${botId}/channels`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channelId }) }); if (res.ok) fetchBot() } catch (err) { console.error(err) }
  }

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault(); setAddingGroup(true); setGroupError('')
    try {
      const res = await fetch(`/api/bots/${botId}/groups`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId: groupInput }) })
      const data = await res.json()
      if (res.ok) { setGroupInput(''); fetchBot() } else { setGroupError(data.error || 'Gagal') }
    } catch (err) { setGroupError('Gagal menghubungi server') }
    finally { setAddingGroup(false) }
  }

  const handleRemoveGroup = async (groupId: string) => {
    try { const res = await fetch(`/api/bots/${botId}/groups`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId }) }); if (res.ok) fetchBot() } catch (err) { console.error(err) }
  }

  const handleSetupWebhook = async () => {
    setWebhookStatus('loading')
    try {
      const res = await fetch(`/api/bots/${botId}/webhook`, { method: 'POST' })
      if (res.ok) { setWebhookStatus('success'); fetchBot() } else { setWebhookStatus('error') }
    } catch (err) { setWebhookStatus('error') }
    setTimeout(() => setWebhookStatus(''), 3000)
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

  if (!bot) return null

  const unusedFeatures = AVAILABLE_FEATURES.filter(f => !activeFeatures.includes(f.id))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-slate-800">{bot.botName}</h1>
            <p className="text-xs text-slate-500">@{bot.botUsername}</p>
          </div>
          <div className="flex items-center gap-2">
            {bot.webhookUrl && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Online"></div>}
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${bot.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
              {bot.isActive ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-3">

        {/* WEBHOOK */}
        {activeFeatures.includes('webhook') && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🌐</span>
                <h2 className="text-sm font-semibold text-slate-800">Webhook</h2>
              </div>
              {confirmDelete === 'webhook' ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500">Hapus fitur ini?</span>
                  <button onClick={() => handleDeleteFeature('webhook')} className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded">Ya</button>
                  <button onClick={() => setConfirmDelete('')} className="text-xs text-slate-500 hover:text-slate-700">Batal</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete('webhook')} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Hapus</button>
              )}
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-slate-500 mb-3">Aktifkan webhook agar bot berjalan 24 jam.</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSetupWebhook}
                  disabled={webhookStatus === 'loading'}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                >
                  {webhookStatus === 'loading' ? 'Mengatur...' : bot.webhookUrl ? 'Update' : 'Setup Webhook'}
                </button>
                {webhookStatus === 'success' && <span className="text-emerald-600 text-xs">Berhasil!</span>}
                {webhookStatus === 'error' && <span className="text-red-500 text-xs">Gagal</span>}
              </div>
              {bot.webhookUrl && <p className="text-[10px] text-slate-400 mt-2 break-all font-mono">{bot.webhookUrl}</p>}
            </div>
          </section>
        )}

        {/* FORCE JOIN */}
        {activeFeatures.includes('force_join') && (
          <section className={`bg-white rounded-xl border shadow-sm overflow-hidden ${bot.forceJoinEnabled === false ? 'border-yellow-200 bg-yellow-50/30' : 'border-slate-200'}`}>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🔒</span>
                <h2 className="text-sm font-semibold text-slate-800">Force Join Channel</h2>
                {bot.forceJoinEnabled === false && (
                  <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-md font-medium">Nonaktif</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggleFeature('force_join', bot.forceJoinEnabled === false)}
                  disabled={togglingFeature === 'force_join'}
                  className={`text-xs px-2 py-0.5 rounded-md transition-colors ${
                    bot.forceJoinEnabled === false
                      ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                  }`}
                >
                  {bot.forceJoinEnabled === false ? 'Aktifkan' : 'Matikan'}
                </button>
                <button onClick={() => { setEditingText(!editingText); setEditingSuccessText(false) }} className="text-xs text-indigo-500 hover:text-indigo-700 px-2 py-0.5 rounded-md hover:bg-indigo-50 transition-colors">
                  Edit Teks
                </button>
                <button onClick={() => { setEditingSuccessText(!editingSuccessText); setEditingText(false) }} className="text-xs text-emerald-500 hover:text-emerald-700 px-2 py-0.5 rounded-md hover:bg-emerald-50 transition-colors">
                  Sukses
                </button>
                {confirmDelete === 'force_join' ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleDeleteFeature('force_join')} className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded">Ya</button>
                    <button onClick={() => setConfirmDelete('')} className="text-xs text-slate-500">Batal</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete('force_join')} className="text-xs text-slate-400 hover:text-red-500 px-2 py-0.5 transition-colors">Hapus</button>
                )}
              </div>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-slate-500 mb-3">Member wajib join channel sebelum kirim pesan di grup.</p>

              {/* Edit Warning Text */}
              {editingText && (
                <div className="mb-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <label className="block text-xs text-indigo-700 mb-1.5 font-medium">Pesan Warning:</label>
                  <textarea
                    value={forceJoinMessage}
                    onChange={(e) => setForceJoinMessage(e.target.value)}
                    placeholder={"⚠️ {mention}, kamu harus join channel berikut:\n\n{channels}\n\nJoin dulu ya!"}
                    rows={4}
                    className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none bg-white"
                  />
                  <p className="text-[10px] text-indigo-400 mt-1.5">Variabel: {'{mention}'} {'{name}'} {'{username}'} {'{id}'} {'{channels}'}</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={handleSaveMessage} disabled={savingText} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs rounded-lg transition-colors">{savingText ? 'Menyimpan...' : 'Simpan'}</button>
                    <button onClick={() => setEditingText(false)} className="px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">Batal</button>
                  </div>
                </div>
              )}

              {/* Edit Success Text */}
              {editingSuccessText && (
                <div className="mb-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <label className="block text-xs text-emerald-700 mb-1.5 font-medium">Pesan Sukses (setelah join):</label>
                  <textarea
                    value={successMessage}
                    onChange={(e) => setSuccessMessage(e.target.value)}
                    placeholder={"✅ {mention}, terima kasih sudah join! Sekarang kamu bisa kirim pesan."}
                    rows={3}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none bg-white"
                  />
                  <p className="text-[10px] text-emerald-400 mt-1.5">Variabel: {'{mention}'} {'{name}'} {'{username}'} {'{id}'}</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={handleSaveSuccessMessage} disabled={savingSuccessText} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs rounded-lg transition-colors">{savingSuccessText ? 'Menyimpan...' : 'Simpan'}</button>
                    <button onClick={() => setEditingSuccessText(false)} className="px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">Batal</button>
                  </div>
                </div>
              )}

              {/* Add Channel */}
              {bot.forceJoinEnabled !== false && (
                <>
                  <form onSubmit={handleAddChannel} className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={channelInput}
                      onChange={(e) => setChannelInput(e.target.value)}
                      placeholder="@usernamechannel"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white"
                      required
                    />
                    <button type="submit" disabled={addingChannel} className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-medium rounded-lg transition-colors">
                      {addingChannel ? '...' : 'Tambah'}
                    </button>
                  </form>
                  {channelError && <p className="text-red-500 text-xs mb-2">{channelError}</p>}
                  {bot.channels.length > 0 && (
                    <div className="space-y-1.5">
                      {bot.channels.map((channel) => (
                        <div key={channel.channelId} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                          <div>
                            <p className="text-sm text-slate-700 font-medium">{channel.channelTitle}</p>
                            <p className="text-[10px] text-slate-400">{channel.channelUsername ? `@${channel.channelUsername}` : channel.channelId}</p>
                          </div>
                          <button onClick={() => handleRemoveChannel(channel.channelId)} className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-0.5 rounded transition-colors">Hapus</button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {/* PROTECT GROUP */}
        {activeFeatures.includes('protect_group') && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🛡</span>
                <h2 className="text-sm font-semibold text-slate-800">Proteksi Grup</h2>
              </div>
              {confirmDelete === 'protect_group' ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500">Hapus?</span>
                  <button onClick={() => handleDeleteFeature('protect_group')} className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded">Ya</button>
                  <button onClick={() => setConfirmDelete('')} className="text-xs text-slate-500">Batal</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete('protect_group')} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Hapus</button>
              )}
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">Bot harus admin di grup dengan izin hapus pesan.</p>
              <p className="text-[10px] text-slate-400 mb-3">
                Dapatkan Group ID dari <a href="https://t.me/getidsbot" target="_blank" className="text-indigo-500 hover:underline">@getidsbot</a>
              </p>

              <form onSubmit={handleAddGroup} className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={groupInput}
                  onChange={(e) => setGroupInput(e.target.value)}
                  placeholder="-1001234567890"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white"
                  required
                />
                <button type="submit" disabled={addingGroup} className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-medium rounded-lg transition-colors">
                  {addingGroup ? '...' : 'Tambah'}
                </button>
              </form>
              {groupError && <p className="text-red-500 text-xs mb-2">{groupError}</p>}
              {bot.groups.length > 0 && (
                <div className="space-y-1.5">
                  {bot.groups.map((group) => (
                    <div key={group.groupId} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                      <div>
                        <p className="text-sm text-slate-700 font-medium">{group.groupTitle}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{group.groupId}</p>
                      </div>
                      <button onClick={() => handleRemoveGroup(group.groupId)} className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-0.5 rounded transition-colors">Hapus</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Empty State */}
        {activeFeatures.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-100 rounded-xl mb-3">
              <span className="text-2xl">⚡</span>
            </div>
            <p className="text-slate-600 text-sm font-medium">Belum ada fitur aktif</p>
            <p className="text-slate-400 text-xs mt-1">Tambahkan fitur untuk mulai menggunakan bot</p>
          </div>
        )}

        {/* Add Feature */}
        {unusedFeatures.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowFeatureMenu(!showFeatureMenu)}
              className="w-full py-3 border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl text-sm text-slate-500 hover:text-indigo-600 transition-all hover:bg-indigo-50/50"
            >
              + Tambah Fitur
            </button>

            {showFeatureMenu && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-lg z-10 overflow-hidden">
                {unusedFeatures.map((feature) => (
                  <button
                    key={feature.id}
                    onClick={() => addFeature(feature.id)}
                    className="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b border-slate-100 last:border-b-0 transition-colors flex items-center gap-3"
                  >
                    <span className="text-lg">{feature.icon}</span>
                    <div>
                      <p className="text-sm text-slate-700 font-medium">{feature.name}</p>
                      <p className="text-[10px] text-slate-400">{feature.desc}</p>
                    </div>
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
