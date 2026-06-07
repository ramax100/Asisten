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
  botToken: string
  channels: Channel[]
  groups: Group[]
  isActive: boolean
  webhookUrl: string
  forceJoinEnabled: boolean
  forceJoinMessage: string
  successMessage: string
  enabledFeatures: string[]
}

interface Feature {
  id: string
  name: string
  desc: string
  icon: string
}

const ALL_FEATURES: Feature[] = [
  { id: 'webhook', name: 'Webhook', desc: 'Aktifkan bot 24 jam', icon: '🌐' },
  { id: 'force_join', name: 'Force Join Channel', desc: 'Wajibkan member join channel sebelum kirim pesan', icon: '🔒' },
  { id: 'protect_group', name: 'Proteksi Grup', desc: 'Tambahkan grup yang ingin dilindungi', icon: '🛡' },
]

export default function BotSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const botId = params.botId as string

  const [bot, setBot] = useState<BotDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddFeature, setShowAddFeature] = useState(false)
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([])

  // Form states
  const [channelInput, setChannelInput] = useState('')
  const [groupInput, setGroupInput] = useState('')
  const [addingChannel, setAddingChannel] = useState(false)
  const [addingGroup, setAddingGroup] = useState(false)
  const [webhookStatus, setWebhookStatus] = useState('')
  const [channelError, setChannelError] = useState('')
  const [groupError, setGroupError] = useState('')

  // Edit text
  const [editingWarning, setEditingWarning] = useState(false)
  const [editingSuccess, setEditingSuccess] = useState(false)
  const [warningText, setWarningText] = useState('')
  const [successText, setSuccessText] = useState('')
  const [saving, setSaving] = useState(false)

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState('')

  useEffect(() => { fetchBot() }, [botId])

  useEffect(() => {
    if (bot) {
      setEnabledFeatures(bot.enabledFeatures || [])
      setWarningText(bot.forceJoinMessage || '')
      setSuccessText(bot.successMessage || '')
    }
  }, [bot])

  const fetchBot = async () => {
    try {
      const res = await fetch(`/api/bots/${botId}`)
      if (res.ok) { const data = await res.json(); setBot(data.bot) }
      else { router.push('/dashboard') }
    } catch { router.push('/dashboard') }
    finally { setLoading(false) }
  }

  // === ADD / REMOVE FEATURE ===
  const handleAddFeature = async (featureId: string) => {
    const updated = [...enabledFeatures, featureId]
    setEnabledFeatures(updated)
    setShowAddFeature(false)
    await fetch(`/api/bots/${botId}/features`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'enable_feature', featureId }),
    })
    fetchBot()
  }

  const handleDeleteFeature = async (featureId: string) => {
    setConfirmDelete('')
    const updated = enabledFeatures.filter(f => f !== featureId)
    setEnabledFeatures(updated)
    await fetch(`/api/bots/${botId}/features`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: featureId }),
    })
    fetchBot()
  }

  // === TOGGLE FEATURE ===
  const handleToggleForceJoin = async () => {
    await fetch(`/api/bots/${botId}/features`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'force_join', enabled: bot?.forceJoinEnabled === false }),
    })
    fetchBot()
  }

  // === SAVE TEXT ===
  const handleSaveWarning = async () => {
    setSaving(true)
    await fetch(`/api/bots/${botId}/features`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'force_join_message', message: warningText }),
    })
    setEditingWarning(false)
    setSaving(false)
    fetchBot()
  }

  const handleSaveSuccess = async () => {
    setSaving(true)
    await fetch(`/api/bots/${botId}/features`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'success_message', message: successText }),
    })
    setEditingSuccess(false)
    setSaving(false)
    fetchBot()
  }

  // Delete/reset messages
  const handleDeleteWarning = async () => {
    await fetch(`/api/bots/${botId}/features`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'force_join_message', message: '' }),
    })
    setWarningText('')
    setEditingWarning(false)
    fetchBot()
  }

  const handleDeleteSuccess = async () => {
    await fetch(`/api/bots/${botId}/features`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'success_message', message: '' }),
    })
    setSuccessText('')
    setEditingSuccess(false)
    fetchBot()
  }

  // === CHANNEL / GROUP / WEBHOOK ===
  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault(); setAddingChannel(true); setChannelError('')
    try {
      const res = await fetch(`/api/bots/${botId}/channels`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channelUsername: channelInput }) })
      const data = await res.json()
      if (res.ok) { setChannelInput(''); fetchBot() } else { setChannelError(data.error || 'Gagal') }
    } catch { setChannelError('Gagal menghubungi server') }
    finally { setAddingChannel(false) }
  }

  const handleRemoveChannel = async (channelId: string) => {
    await fetch(`/api/bots/${botId}/channels`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channelId }) })
    fetchBot()
  }

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault(); setAddingGroup(true); setGroupError('')
    try {
      const res = await fetch(`/api/bots/${botId}/groups`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId: groupInput }) })
      const data = await res.json()
      if (res.ok) { setGroupInput(''); fetchBot() } else { setGroupError(data.error || 'Gagal') }
    } catch { setGroupError('Gagal menghubungi server') }
    finally { setAddingGroup(false) }
  }

  const handleRemoveGroup = async (groupId: string) => {
    await fetch(`/api/bots/${botId}/groups`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId }) })
    fetchBot()
  }

  const handleSetupWebhook = async () => {
    setWebhookStatus('loading')
    try {
      const res = await fetch(`/api/bots/${botId}/webhook`, { method: 'POST' })
      if (res.ok) { setWebhookStatus('success'); fetchBot() } else { setWebhookStatus('error') }
    } catch { setWebhookStatus('error') }
    setTimeout(() => setWebhookStatus(''), 3000)
  }

  const handleDeleteWebhook = async () => {
    await fetch(`/api/bots/${botId}/webhook`, { method: 'DELETE' })
    fetchBot()
  }

  // === RENDER ===
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

  const availableFeatures = ALL_FEATURES.filter(f => !enabledFeatures.includes(f.id))

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
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        {/* ===== INFO BOT ===== */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <span className="text-base">🤖</span>
            <h2 className="text-sm font-semibold text-slate-800">Info Bot</h2>
          </div>
          <div className="divide-y divide-slate-50">
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">📡 Status</span>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${bot.webhookUrl ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`}></div>
                <span className={`text-xs font-medium ${bot.webhookUrl ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {bot.webhookUrl ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">👤 Nama</span>
              <span className="text-xs font-medium text-slate-800">{bot.botName}</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">🆔 Username</span>
              <span className="text-xs font-medium text-slate-800">@{bot.botUsername}</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">🔑 Token</span>
              <span className="text-xs font-mono text-slate-500">{bot.botToken}</span>
            </div>
          </div>
        </section>

        {/* ===== ENABLED FEATURES ===== */}

        {/* WEBHOOK */}
        {enabledFeatures.includes('webhook') && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>🌐</span>
                <h2 className="text-sm font-semibold text-slate-800">Webhook</h2>
              </div>
              {confirmDelete === 'webhook' ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500">Hapus fitur?</span>
                  <button onClick={() => handleDeleteFeature('webhook')} className="text-xs bg-red-500 text-white px-2 py-0.5 rounded hover:bg-red-600">Ya</button>
                  <button onClick={() => setConfirmDelete('')} className="text-xs text-slate-400 hover:text-slate-600">Batal</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete('webhook')} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Hapus</button>
              )}
            </div>
            <div className="px-4 py-4">
              <p className="text-xs text-slate-500 mb-3">Bot akan berjalan 24 jam setelah webhook aktif.</p>
              <div className="flex items-center gap-2">
                <button onClick={handleSetupWebhook} disabled={webhookStatus === 'loading'} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-medium rounded-lg transition-colors shadow-sm">
                  {webhookStatus === 'loading' ? 'Mengatur...' : bot.webhookUrl ? 'Update' : 'Setup Webhook'}
                </button>
                {bot.webhookUrl && (
                  <button onClick={handleDeleteWebhook} className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">Nonaktifkan</button>
                )}
                {webhookStatus === 'success' && <span className="text-emerald-600 text-xs">Berhasil!</span>}
                {webhookStatus === 'error' && <span className="text-red-500 text-xs">Gagal. Pastikan NEXT_PUBLIC_BASE_URL diisi.</span>}
              </div>
              {bot.webhookUrl && <p className="text-[10px] text-slate-400 mt-2 font-mono break-all">{bot.webhookUrl}</p>}
            </div>
          </section>
        )}

        {/* FORCE JOIN */}
        {enabledFeatures.includes('force_join') && (
          <section className={`bg-white rounded-xl border shadow-sm overflow-hidden ${bot.forceJoinEnabled === false ? 'border-yellow-200' : 'border-slate-200'}`}>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>🔒</span>
                <h2 className="text-sm font-semibold text-slate-800">Force Join Channel</h2>
                {bot.forceJoinEnabled === false && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">OFF</span>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={handleToggleForceJoin} className={`text-xs px-2 py-0.5 rounded transition-colors ${bot.forceJoinEnabled === false ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'}`}>
                  {bot.forceJoinEnabled === false ? 'Aktifkan' : 'Matikan'}
                </button>
                {confirmDelete === 'force_join' ? (
                  <div className="flex items-center gap-1 ml-1">
                    <button onClick={() => handleDeleteFeature('force_join')} className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">Ya</button>
                    <button onClick={() => setConfirmDelete('')} className="text-xs text-slate-400">Batal</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete('force_join')} className="text-xs text-slate-400 hover:text-red-500 ml-1 transition-colors">Hapus</button>
                )}
              </div>
            </div>
            <div className="px-4 py-4">
              <p className="text-xs text-slate-500 mb-3">Member wajib join channel sebelum bisa kirim pesan di grup.</p>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={() => { setEditingWarning(!editingWarning); setEditingSuccess(false) }} className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${editingWarning ? 'border-indigo-300 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-500'}`}>
                  Pesan Warning
                  {bot.forceJoinMessage ? (
                    <span className="text-[9px] bg-emerald-100 text-emerald-600 px-1 py-0.5 rounded font-medium">Aktif</span>
                  ) : (
                    <span className="text-[9px] bg-slate-100 text-slate-400 px-1 py-0.5 rounded font-medium">Default</span>
                  )}
                </button>
                <button onClick={() => { setEditingSuccess(!editingSuccess); setEditingWarning(false) }} className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${editingSuccess ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-500 hover:border-emerald-200 hover:text-emerald-500'}`}>
                  Pesan Sukses
                  {bot.successMessage ? (
                    <span className="text-[9px] bg-emerald-100 text-emerald-600 px-1 py-0.5 rounded font-medium">Aktif</span>
                  ) : (
                    <span className="text-[9px] bg-slate-100 text-slate-400 px-1 py-0.5 rounded font-medium">Default</span>
                  )}
                </button>
              </div>

              {/* Edit Warning */}
              {editingWarning && (
                <div className="mb-4 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                  <label className="block text-xs text-indigo-700 mb-1.5 font-medium">Pesan Warning:</label>
                  <textarea value={warningText} onChange={(e) => setWarningText(e.target.value)} placeholder={"⚠️ {mention}, kamu harus join channel:\n\n{channels}\n\nJoin dulu ya!"} rows={4} className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none bg-white" />
                  <p className="text-[10px] text-indigo-400 mt-1">Variabel: {'{mention}'} {'{name}'} {'{username}'} {'{id}'} {'{channels}'}</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={handleSaveWarning} disabled={saving} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs rounded-lg">{saving ? '...' : 'Simpan'}</button>
                    <button onClick={() => { setWarningText(''); handleDeleteWarning() }} className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50">Hapus Pesan</button>
                    <button onClick={() => setEditingWarning(false)} className="px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">Batal</button>
                  </div>
                </div>
              )}

              {/* Edit Success */}
              {editingSuccess && (
                <div className="mb-4 p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                  <label className="block text-xs text-emerald-700 mb-1.5 font-medium">Pesan Sukses (setelah join):</label>
                  <textarea value={successText} onChange={(e) => setSuccessText(e.target.value)} placeholder={"✅ {mention}, terima kasih sudah join!"} rows={3} className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none bg-white" />
                  <p className="text-[10px] text-emerald-400 mt-1">Variabel: {'{mention}'} {'{name}'} {'{username}'} {'{id}'}</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={handleSaveSuccess} disabled={saving} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs rounded-lg">{saving ? '...' : 'Simpan'}</button>
                    <button onClick={() => { setSuccessText(''); handleDeleteSuccess() }} className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50">Hapus Pesan</button>
                    <button onClick={() => setEditingSuccess(false)} className="px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">Batal</button>
                  </div>
                </div>
              )}

              {/* Add Channel */}
              {bot.forceJoinEnabled !== false && (
                <>
                  <form onSubmit={handleAddChannel} className="flex gap-2 mb-3">
                    <input type="text" value={channelInput} onChange={(e) => setChannelInput(e.target.value)} placeholder="@usernamechannel" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white" required />
                    <button type="submit" disabled={addingChannel} className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-medium rounded-lg transition-colors">{addingChannel ? '...' : 'Tambah'}</button>
                  </form>
                  {channelError && <p className="text-red-500 text-xs mb-2">{channelError}</p>}
                  {bot.channels.length > 0 && (
                    <div className="space-y-1.5">
                      {bot.channels.map((ch) => (
                        <div key={ch.channelId} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                          <div>
                            <p className="text-sm text-slate-700 font-medium">{ch.channelTitle}</p>
                            <p className="text-[10px] text-slate-400">{ch.channelUsername ? `@${ch.channelUsername}` : ch.channelId}</p>
                          </div>
                          <button onClick={() => handleRemoveChannel(ch.channelId)} className="text-xs text-red-400 hover:text-red-600 px-2 py-0.5 rounded hover:bg-red-50 transition-colors">Hapus</button>
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
        {enabledFeatures.includes('protect_group') && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>🛡</span>
                <h2 className="text-sm font-semibold text-slate-800">Proteksi Grup</h2>
              </div>
              {confirmDelete === 'protect_group' ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDeleteFeature('protect_group')} className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">Ya</button>
                  <button onClick={() => setConfirmDelete('')} className="text-xs text-slate-400">Batal</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete('protect_group')} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Hapus</button>
              )}
            </div>
            <div className="px-4 py-4">
              <p className="text-xs text-slate-500 mb-1">Bot harus admin di grup dengan izin hapus pesan.</p>
              <p className="text-[10px] text-slate-400 mb-3">Dapatkan Group ID dari <a href="https://t.me/getidsbot" target="_blank" className="text-indigo-500 hover:underline">@getidsbot</a></p>
              <form onSubmit={handleAddGroup} className="flex gap-2 mb-3">
                <input type="text" value={groupInput} onChange={(e) => setGroupInput(e.target.value)} placeholder="-1001234567890" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white" required />
                <button type="submit" disabled={addingGroup} className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-medium rounded-lg transition-colors">{addingGroup ? '...' : 'Tambah'}</button>
              </form>
              {groupError && <p className="text-red-500 text-xs mb-2">{groupError}</p>}
              {bot.groups.length > 0 && (
                <div className="space-y-1.5">
                  {bot.groups.map((gr) => (
                    <div key={gr.groupId} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                      <div>
                        <p className="text-sm text-slate-700 font-medium">{gr.groupTitle}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{gr.groupId}</p>
                      </div>
                      <button onClick={() => handleRemoveGroup(gr.groupId)} className="text-xs text-red-400 hover:text-red-600 px-2 py-0.5 rounded hover:bg-red-50 transition-colors">Hapus</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ===== ADD FEATURE BUTTON ===== */}
        <button
          onClick={() => setShowAddFeature(true)}
          className="w-full py-3 border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl text-sm text-slate-500 hover:text-indigo-600 transition-all hover:bg-indigo-50/30"
        >
          + Tambah Fitur
        </button>

        {/* ===== ADD FEATURE POPUP ===== */}
        {showAddFeature && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={() => setShowAddFeature(false)}>
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-slate-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">Tambah Fitur</h3>
                <p className="text-xs text-slate-500 mt-0.5">Pilih fitur yang ingin ditambahkan</p>
              </div>
              <div className="p-2">
                {ALL_FEATURES.map((feature) => {
                  const isAdded = enabledFeatures.includes(feature.id)
                  return (
                    <button
                      key={feature.id}
                      onClick={() => !isAdded && handleAddFeature(feature.id)}
                      disabled={isAdded}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 ${
                        isAdded
                          ? 'bg-emerald-50/50 cursor-default'
                          : 'hover:bg-indigo-50 cursor-pointer'
                      }`}
                    >
                      <span className="text-xl">{feature.icon}</span>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${isAdded ? 'text-slate-400' : 'text-slate-700'}`}>{feature.name}</p>
                        <p className="text-[10px] text-slate-400">{feature.desc}</p>
                      </div>
                      {isAdded && (
                        <span className="text-emerald-500 text-sm">✅</span>
                      )}
                    </button>
                  )
                })}
              </div>
              <div className="px-5 py-3 border-t border-slate-100">
                <button onClick={() => setShowAddFeature(false)} className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 transition-colors">Tutup</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
