'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

// Greeting Editor sub-component
function GreetingEditor({ waktu, value, botId, onSaved }: { waktu: string; value: string; botId: string; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(value)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setText(value) }, [value])

  const handleSave = async () => {
    setSaving(true)
    await fetch(`/api/bots/${botId}/features`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: `greeting_${waktu}`, message: text }),
    })
    setSaving(false)
    setEditing(false)
    onSaved()
  }

  const handleDisable = async () => {
    await fetch(`/api/bots/${botId}/features`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: `greeting_${waktu}`, message: '__disabled__' }),
    })
    setEditing(false)
    onSaved()
  }

  const handleEnable = async () => {
    await fetch(`/api/bots/${botId}/features`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: `greeting_${waktu}`, message: '' }),
    })
    onSaved()
  }

  if (value === '' && !editing) {
    // Check if parent marked as disabled
    return (
      <div className="flex gap-2">
        <button onClick={() => setEditing(true)} className="text-[10px] text-indigo-500 hover:text-indigo-700">Edit</button>
        <button onClick={handleDisable} className="text-[10px] text-red-400 hover:text-red-600">Nonaktifkan</button>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="mt-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={`Selamat ${waktu} semuanya! Semoga hari ini menyenangkan 😊`} rows={2} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none bg-white" />
        <div className="flex gap-2 mt-1.5">
          <button onClick={handleSave} disabled={saving} className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded hover:bg-indigo-700">{saving ? '...' : 'Simpan'}</button>
          <button onClick={handleDisable} className="text-[10px] text-red-500 hover:text-red-700">Nonaktifkan</button>
          <button onClick={() => setEditing(false)} className="text-[10px] text-slate-400 hover:text-slate-600">Batal</button>
        </div>
      </div>
    )
  }

  // Has value set
  return (
    <div>
      <p className="text-[10px] text-slate-500 italic mb-1 truncate">"{value}"</p>
      <div className="flex gap-2">
        <button onClick={() => setEditing(true)} className="text-[10px] text-indigo-500 hover:text-indigo-700">Edit</button>
        <button onClick={handleEnable} className="text-[10px] text-emerald-500 hover:text-emerald-700">Reset Default</button>
        <button onClick={handleDisable} className="text-[10px] text-red-400 hover:text-red-600">Nonaktifkan</button>
      </div>
    </div>
  )
}

// Diagnostic Section sub-component
function DiagnosticSection({ botId, confirmDelete, setConfirmDelete, handleDeleteFeature }: { botId: string; confirmDelete: string; setConfirmDelete: (v: string) => void; handleDeleteFeature: (v: string) => void }) {
  const [running, setRunning] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [results, setResults] = useState<any>(null)

  const runDiagnostic = async () => {
    setRunning(true)
    setResults(null)
    try {
      const res = await fetch(`/api/bots/${botId}/diagnostic`)
      if (res.ok) {
        const data = await res.json()
        setResults(data)
      }
    } catch (err) { console.error(err) }
    finally { setRunning(false) }
  }

  const autoFixWebhook = async () => {
    setFixing(true)
    try {
      const res = await fetch(`/api/bots/${botId}/diagnostic`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        alert('Webhook berhasil diperbarui!')
        runDiagnostic()
      } else {
        alert(data.error || 'Gagal fix webhook')
      }
    } catch (err) { alert('Gagal menghubungi server') }
    finally { setFixing(false) }
  }

  const statusIcon = (status: string) => {
    if (status === 'ok') return '✅'
    if (status === 'warning') return '⚠️'
    return '❌'
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>🔧</span>
          <h2 className="text-sm font-semibold text-slate-800">Diagnostik</h2>
        </div>
        {confirmDelete === 'diagnostic' ? (
          <div className="flex items-center gap-2">
            <button onClick={() => handleDeleteFeature('diagnostic')} className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">Ya</button>
            <button onClick={() => setConfirmDelete('')} className="text-xs text-slate-400">Batal</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete('diagnostic')} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Hapus</button>
        )}
      </div>
      <div className="px-4 py-4">
        <p className="text-xs text-slate-500 mb-3">Cek status bot, webhook, akses channel & grup. Auto-fix jika ada masalah.</p>

        <div className="flex gap-2 mb-4">
          <button onClick={runDiagnostic} disabled={running} className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-medium rounded-lg transition-colors">
            {running ? 'Memeriksa...' : 'Jalankan Diagnostik'}
          </button>
          <button onClick={autoFixWebhook} disabled={fixing} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-medium rounded-lg transition-colors">
            {fixing ? 'Memperbaiki...' : 'Auto-Fix Webhook'}
          </button>
        </div>

        {results && (
          <div className="space-y-2">
            {results.checks.map((check: any, i: number) => (
              <div key={i} className="flex items-start gap-2 bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                <span className="text-sm mt-0.5">{statusIcon(check.status)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700">{check.name}</p>
                  <p className="text-[10px] text-slate-500 break-all">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// Banned Words Section
function BannedWordsSection({ botId, bot, confirmDelete, setConfirmDelete, handleDeleteFeature, fetchBot }: any) {
  const [words, setWords] = useState((bot.bannedWords || []).join(', '))
  const [action, setAction] = useState(bot.bannedWordsAction || 'delete_warn')
  const [customMsg, setCustomMsg] = useState(bot.bannedWordsMessage || '')
  const [showEditMsg, setShowEditMsg] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await fetch(`/api/bots/${botId}/features`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feature: 'banned_words', message: words }) })
    await fetch(`/api/bots/${botId}/features`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feature: 'banned_words_action', message: action }) })
    await fetch(`/api/bots/${botId}/features`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feature: 'banned_words_message', message: customMsg }) })
    setSaving(false)
    fetchBot()
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>🤬</span>
          <h2 className="text-sm font-semibold text-slate-800">Kata Terlarang</h2>
        </div>
        {confirmDelete === 'banned_words' ? (
          <div className="flex items-center gap-2">
            <button onClick={() => handleDeleteFeature('banned_words')} className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">Ya</button>
            <button onClick={() => setConfirmDelete('')} className="text-xs text-slate-400">Batal</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete('banned_words')} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Hapus</button>
        )}
      </div>
      <div className="px-4 py-4">
        <p className="text-xs text-slate-500 mb-3">Pesan yang mengandung kata terlarang akan otomatis dihapus.</p>
        <div className="mb-3">
          <label className="block text-xs text-slate-600 mb-1 font-medium">Daftar kata (pisahkan dengan koma):</label>
          <textarea value={words} onChange={(e) => setWords(e.target.value)} placeholder="kata1, kata2, kata3" rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none bg-slate-50" />
        </div>
        <div className="mb-3">
          <label className="block text-xs text-slate-600 mb-1 font-medium">Aksi:</label>
          <select value={action} onChange={(e) => setAction(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-slate-50">
            <option value="delete_only">Hapus pesan saja</option>
            <option value="delete_warn">Hapus + peringatan</option>
            <option value="delete_mute">Hapus + mute 5 menit</option>
          </select>
        </div>
        <div className="mb-3">
          <button onClick={() => setShowEditMsg(!showEditMsg)} className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${showEditMsg ? 'border-indigo-300 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-500 hover:text-indigo-500'}`}>
            Custom Pesan {customMsg ? '●' : ''}
          </button>
          {showEditMsg && (
            <div className="mt-2">
              <textarea value={customMsg} onChange={(e) => setCustomMsg(e.target.value)} placeholder="⚠️ {mention}, pesanmu dihapus karena mengandung kata terlarang: {word}" rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none bg-slate-50" />
              <p className="text-[10px] text-slate-400 mt-1">Variabel: {'{mention}'} {'{name}'} {'{word}'}</p>
            </div>
          )}
        </div>
        <button onClick={handleSave} disabled={saving} className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-medium rounded-lg">
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
        {bot.bannedWords && bot.bannedWords.length > 0 && (
          <p className="text-[10px] text-slate-400 mt-2">Tersimpan: {bot.bannedWords.length} kata</p>
        )}
      </div>
    </section>
  )
}

// Anti-Spam Section
function AntiSpamSection({ botId, bot, confirmDelete, setConfirmDelete, handleDeleteFeature, fetchBot }: any) {
  const [limit, setLimit] = useState(bot.antiSpamLimit || 5)
  const [spamInterval, setSpamInterval] = useState(bot.antiSpamInterval || 10)
  const [muteDuration, setMuteDuration] = useState(bot.antiSpamMuteDuration || '5m')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await fetch(`/api/bots/${botId}/features`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'anti_spam_settings', message: JSON.stringify({ limit, interval: spamInterval, muteDuration }) }),
    })
    setSaving(false)
    fetchBot()
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>🚫</span>
          <h2 className="text-sm font-semibold text-slate-800">Anti-Spam</h2>
        </div>
        {confirmDelete === 'anti_spam' ? (
          <div className="flex items-center gap-2">
            <button onClick={() => handleDeleteFeature('anti_spam')} className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">Ya</button>
            <button onClick={() => setConfirmDelete('')} className="text-xs text-slate-400">Batal</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete('anti_spam')} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Hapus</button>
        )}
      </div>
      <div className="px-4 py-4">
        <p className="text-xs text-slate-500 mb-3">Mute member yang mengirim pesan terlalu banyak dalam waktu singkat.</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Batas pesan</label>
            <input type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value))} min={2} max={50} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-slate-50" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Dalam (detik)</label>
            <input type="number" value={spamInterval} onChange={(e) => setSpamInterval(Number(e.target.value))} min={5} max={120} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-slate-50" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Mute durasi</label>
            <select value={muteDuration} onChange={(e) => setMuteDuration(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-slate-50">
              <option value="1m">1 menit</option>
              <option value="5m">5 menit</option>
              <option value="15m">15 menit</option>
              <option value="30m">30 menit</option>
              <option value="1h">1 jam</option>
              <option value="1d">1 hari</option>
            </select>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-medium rounded-lg">
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
        <p className="text-[10px] text-slate-400 mt-2">Saat ini: mute jika kirim &gt;{bot.antiSpamLimit || 5} pesan dalam {bot.antiSpamInterval || 10} detik</p>
      </div>
    </section>
  )
}

// Anti-Forward Section
function AntiForwardSection({ botId, bot, confirmDelete, setConfirmDelete, handleDeleteFeature, fetchBot }: any) {
  const [warningLimit, setWarningLimit] = useState(bot.antiForwardWarningLimit || 3)
  const [muteDuration, setMuteDuration] = useState(bot.antiForwardMuteDuration || '1h')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await fetch(`/api/bots/${botId}/features`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'anti_forward_settings', message: JSON.stringify({ warningLimit, muteDuration }) }),
    })
    setSaving(false)
    fetchBot()
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>↩️</span>
          <h2 className="text-sm font-semibold text-slate-800">Anti-Forward</h2>
        </div>
        {confirmDelete === 'anti_forward' ? (
          <div className="flex items-center gap-2">
            <button onClick={() => handleDeleteFeature('anti_forward')} className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">Ya</button>
            <button onClick={() => setConfirmDelete('')} className="text-xs text-slate-400">Batal</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete('anti_forward')} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Hapus</button>
        )}
      </div>
      <div className="px-4 py-4">
        <p className="text-xs text-slate-500 mb-3">Hapus pesan yang di-forward dari luar grup. Member akan diberi peringatan, setelah batas tercapai akan di-mute.</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Batas peringatan</label>
            <input type="number" value={warningLimit} onChange={(e) => setWarningLimit(Number(e.target.value))} min={1} max={10} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-slate-50" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Mute durasi</label>
            <select value={muteDuration} onChange={(e) => setMuteDuration(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-slate-50">
              <option value="5m">5 menit</option>
              <option value="15m">15 menit</option>
              <option value="30m">30 menit</option>
              <option value="1h">1 jam</option>
              <option value="3h">3 jam</option>
              <option value="1d">1 hari</option>
            </select>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-medium rounded-lg">
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
        <p className="text-[10px] text-slate-400 mt-2">Saat ini: peringatan {bot.antiForwardWarningLimit || 3}x, lalu mute {bot.antiForwardMuteDuration || '1h'}</p>
      </div>
    </section>
  )
}

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
  welcomeMessage: string
  bannedWords: string[]
  bannedWordsAction: string
  bannedWordsMessage: string
  antiSpamLimit: number
  antiSpamInterval: number
  antiSpamMuteDuration: string
  antiSpamMessage: string
  antiForwardWarningLimit: number
  antiForwardMuteDuration: string
  antiForwardWarningMessage: string
  antiForwardMuteMessage: string
  enabledFeatures: string[]
  [key: string]: any
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
  { id: 'welcome', name: 'Welcome Message', desc: 'Sambut member baru yang masuk grup', icon: '👋' },
  { id: 'greeting', name: 'Ucapan Otomatis', desc: 'Kirim ucapan selamat pagi, siang, sore, malam', icon: '🕐' },
  { id: 'moderation', name: 'Moderasi (Mute/Kick/Ban)', desc: 'Admin bisa mute, kick, ban member via command', icon: '⚔️' },
  { id: 'banned_words', name: 'Kata Terlarang', desc: 'Hapus pesan yang mengandung kata tertentu + mute', icon: '🤬' },
  { id: 'anti_forward', name: 'Anti-Forward', desc: 'Larang forward pesan dari luar grup (peringatan 3x lalu mute)', icon: '↩️' },
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
  const [editingWelcome, setEditingWelcome] = useState(false)
  const [warningText, setWarningText] = useState('')
  const [successText, setSuccessText] = useState('')
  const [welcomeText, setWelcomeText] = useState('')
  const [saving, setSaving] = useState(false)

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState('')

  useEffect(() => { fetchBot() }, [botId])

  useEffect(() => {
    if (bot) {
      setEnabledFeatures(bot.enabledFeatures || [])
      setWarningText(bot.forceJoinMessage || '')
      setSuccessText(bot.successMessage || '')
      setWelcomeText(bot.welcomeMessage || '')
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

  // Delete/reset messages (disable feature)
  const handleDeleteWarning = async () => {
    await fetch(`/api/bots/${botId}/features`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'force_join_message', message: '__disabled__' }),
    })
    setWarningText('')
    setEditingWarning(false)
    fetchBot()
  }

  const handleDeleteSuccess = async () => {
    await fetch(`/api/bots/${botId}/features`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'success_message', message: '__disabled__' }),
    })
    setSuccessText('')
    setEditingSuccess(false)
    fetchBot()
  }

  // Re-enable messages (reset to default)
  const handleEnableWarning = async () => {
    await fetch(`/api/bots/${botId}/features`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'force_join_message', message: '' }),
    })
    fetchBot()
  }

  const handleEnableSuccess = async () => {
    await fetch(`/api/bots/${botId}/features`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'success_message', message: '' }),
    })
    fetchBot()
  }

  // Welcome message handlers
  const handleSaveWelcome = async () => {
    setSaving(true)
    await fetch(`/api/bots/${botId}/features`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'welcome_message', message: welcomeText }),
    })
    setEditingWelcome(false)
    setSaving(false)
    fetchBot()
  }

  const handleDeleteWelcome = async () => {
    await fetch(`/api/bots/${botId}/features`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'welcome_message', message: '__disabled__' }),
    })
    setWelcomeText('')
    setEditingWelcome(false)
    fetchBot()
  }

  const handleEnableWelcome = async () => {
    await fetch(`/api/bots/${botId}/features`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'welcome_message', message: '' }),
    })
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
                  {bot.forceJoinMessage === '__disabled__' ? (
                    <span className="text-[9px] bg-red-100 text-red-500 px-1 py-0.5 rounded font-medium">Nonaktif</span>
                  ) : bot.forceJoinMessage ? (
                    <span className="text-[9px] bg-emerald-100 text-emerald-600 px-1 py-0.5 rounded font-medium">Aktif</span>
                  ) : (
                    <span className="text-[9px] bg-slate-100 text-slate-400 px-1 py-0.5 rounded font-medium">Default</span>
                  )}
                </button>
                <button onClick={() => { setEditingSuccess(!editingSuccess); setEditingWarning(false) }} className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${editingSuccess ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-500 hover:border-emerald-200 hover:text-emerald-500'}`}>
                  Pesan Sukses
                  {bot.successMessage === '__disabled__' ? (
                    <span className="text-[9px] bg-red-100 text-red-500 px-1 py-0.5 rounded font-medium">Nonaktif</span>
                  ) : bot.successMessage ? (
                    <span className="text-[9px] bg-emerald-100 text-emerald-600 px-1 py-0.5 rounded font-medium">Aktif</span>
                  ) : (
                    <span className="text-[9px] bg-slate-100 text-slate-400 px-1 py-0.5 rounded font-medium">Default</span>
                  )}
                </button>
              </div>

              {/* Re-enable buttons when disabled */}
              {bot.forceJoinMessage === '__disabled__' && !editingWarning && (
                <div className="mb-3 p-2.5 bg-red-50 rounded-lg border border-red-100 flex items-center justify-between">
                  <span className="text-xs text-red-600">Pesan Warning dinonaktifkan</span>
                  <button onClick={handleEnableWarning} className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-lg transition-colors">Aktifkan Kembali</button>
                </div>
              )}
              {bot.successMessage === '__disabled__' && !editingSuccess && (
                <div className="mb-3 p-2.5 bg-red-50 rounded-lg border border-red-100 flex items-center justify-between">
                  <span className="text-xs text-red-600">Pesan Sukses dinonaktifkan</span>
                  <button onClick={handleEnableSuccess} className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-lg transition-colors">Aktifkan Kembali</button>
                </div>
              )}

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

        {/* WELCOME MESSAGE */}
        {enabledFeatures.includes('welcome') && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>👋</span>
                <h2 className="text-sm font-semibold text-slate-800">Welcome Message</h2>
                {bot.welcomeMessage === '__disabled__' ? (
                  <span className="text-[9px] bg-red-100 text-red-500 px-1 py-0.5 rounded font-medium">Nonaktif</span>
                ) : bot.welcomeMessage ? (
                  <span className="text-[9px] bg-emerald-100 text-emerald-600 px-1 py-0.5 rounded font-medium">Aktif</span>
                ) : (
                  <span className="text-[9px] bg-slate-100 text-slate-400 px-1 py-0.5 rounded font-medium">Default</span>
                )}
              </div>
              {confirmDelete === 'welcome' ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDeleteFeature('welcome')} className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">Ya</button>
                  <button onClick={() => setConfirmDelete('')} className="text-xs text-slate-400">Batal</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete('welcome')} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Hapus</button>
              )}
            </div>
            <div className="px-4 py-4">
              <p className="text-xs text-slate-500 mb-3">Pesan otomatis yang dikirim saat member baru bergabung di grup.</p>

              {/* Re-enable button when disabled */}
              {bot.welcomeMessage === '__disabled__' && !editingWelcome && (
                <div className="mb-3 p-2.5 bg-red-50 rounded-lg border border-red-100 flex items-center justify-between">
                  <span className="text-xs text-red-600">Welcome message dinonaktifkan</span>
                  <button onClick={handleEnableWelcome} className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-lg transition-colors">Aktifkan Kembali</button>
                </div>
              )}

              {/* Edit Welcome */}
              <button onClick={() => setEditingWelcome(!editingWelcome)} className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors mb-3 ${editingWelcome ? 'border-orange-300 bg-orange-50 text-orange-600' : 'border-slate-200 text-slate-500 hover:border-orange-200 hover:text-orange-500'}`}>
                Edit Pesan
              </button>

              {editingWelcome && (
                <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                  <label className="block text-xs text-orange-700 mb-1.5 font-medium">Pesan Welcome:</label>
                  <textarea value={welcomeText} onChange={(e) => setWelcomeText(e.target.value)} placeholder={"👋 Selamat datang {mention} di grup!\n\nSilakan baca rules dan jangan lupa join channel kami."} rows={4} className="w-full px-3 py-2 border border-orange-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none bg-white" />
                  <p className="text-[10px] text-orange-400 mt-1">Variabel: {'{mention}'} {'{name}'} {'{username}'} {'{id}'} {'{group}'}</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={handleSaveWelcome} disabled={saving} className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white text-xs rounded-lg">{saving ? '...' : 'Simpan'}</button>
                    <button onClick={handleDeleteWelcome} className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50">Hapus Pesan</button>
                    <button onClick={() => setEditingWelcome(false)} className="px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">Batal</button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* GREETING / UCAPAN OTOMATIS */}
        {enabledFeatures.includes('greeting') && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>🕐</span>
                <h2 className="text-sm font-semibold text-slate-800">Ucapan Otomatis</h2>
              </div>
              {confirmDelete === 'greeting' ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDeleteFeature('greeting')} className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">Ya</button>
                  <button onClick={() => setConfirmDelete('')} className="text-xs text-slate-400">Batal</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete('greeting')} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Hapus</button>
              )}
            </div>
            <div className="px-4 py-4">
              <p className="text-xs text-slate-500 mb-3">Bot akan kirim ucapan otomatis ke grup sesuai waktu (WIB).</p>
              <p className="text-[10px] text-slate-400 mb-4">Panggil endpoint <span className="font-mono bg-slate-100 px-1 rounded">/api/cron/greeting</span> setiap jam menggunakan <a href="https://cron-job.org" target="_blank" className="text-indigo-500 hover:underline">cron-job.org</a> (gratis)</p>

              <div className="space-y-3">
                {(['pagi', 'siang', 'sore', 'malam'] as const).map((waktu) => {
                  const icons: Record<string, string> = { pagi: '🌅', siang: '☀️', sore: '🌇', malam: '🌙' }
                  const times: Record<string, string> = { pagi: '05:00 - 10:00', siang: '10:00 - 15:00', sore: '15:00 - 18:00', malam: '18:00 - 05:00' }
                  const key = `greeting_${waktu}` as string
                  const value = (bot as any)[key] || ''
                  const isDisabled = value === '__disabled__'

                  return (
                    <div key={waktu} className="bg-slate-50 rounded-lg border border-slate-100 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span>{icons[waktu]}</span>
                          <span className="text-xs font-medium text-slate-700 capitalize">Selamat {waktu}</span>
                          <span className="text-[9px] text-slate-400">({times[waktu]} WIB)</span>
                        </div>
                        {isDisabled ? (
                          <span className="text-[9px] bg-red-100 text-red-500 px-1 py-0.5 rounded font-medium">Nonaktif</span>
                        ) : value ? (
                          <span className="text-[9px] bg-emerald-100 text-emerald-600 px-1 py-0.5 rounded font-medium">Custom</span>
                        ) : (
                          <span className="text-[9px] bg-slate-100 text-slate-400 px-1 py-0.5 rounded font-medium">Default</span>
                        )}
                      </div>
                      <GreetingEditor
                        waktu={waktu}
                        value={isDisabled ? '' : value}
                        botId={botId}
                        onSaved={fetchBot}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* MODERATION */}
        {enabledFeatures.includes('moderation') && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>⚔️</span>
                <h2 className="text-sm font-semibold text-slate-800">Moderasi (Mute/Kick/Ban)</h2>
              </div>
              {confirmDelete === 'moderation' ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDeleteFeature('moderation')} className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">Ya</button>
                  <button onClick={() => setConfirmDelete('')} className="text-xs text-slate-400">Batal</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete('moderation')} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Hapus</button>
              )}
            </div>
            <div className="px-4 py-4">
              <p className="text-xs text-slate-500 mb-4">Admin bisa mute, kick, ban member dengan reply pesan + command. Bot harus admin dengan izin <b>Restrict Members</b>.</p>

              <div className="space-y-2">
                <div className="bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">🔇</span>
                    <span className="text-xs font-medium text-slate-700">/mute [durasi]</span>
                  </div>
                  <p className="text-[10px] text-slate-500 ml-6">Mute member. Durasi: 30s, 5m, 1h, 1d, 7d</p>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">🔊</span>
                    <span className="text-xs font-medium text-slate-700">/unmute</span>
                  </div>
                  <p className="text-[10px] text-slate-500 ml-6">Unmute member yang sedang di-mute</p>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">👢</span>
                    <span className="text-xs font-medium text-slate-700">/kick</span>
                  </div>
                  <p className="text-[10px] text-slate-500 ml-6">Kick member dari grup (bisa join lagi)</p>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">🚫</span>
                    <span className="text-xs font-medium text-slate-700">/ban</span>
                  </div>
                  <p className="text-[10px] text-slate-500 ml-6">Ban member permanen (tidak bisa join lagi)</p>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">✅</span>
                    <span className="text-xs font-medium text-slate-700">/unban</span>
                  </div>
                  <p className="text-[10px] text-slate-500 ml-6">Unban member yang sudah di-ban</p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-[10px] text-amber-700"><b>Cara pakai:</b> Reply pesan member → ketik command (contoh: /mute 1h)</p>
              </div>
            </div>
          </section>
        )}

        {/* BANNED WORDS */}
        {enabledFeatures.includes('banned_words') && (
          <BannedWordsSection botId={botId} bot={bot} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} handleDeleteFeature={handleDeleteFeature} fetchBot={fetchBot} />
        )}

        {/* ANTI-SPAM */}
        {enabledFeatures.includes('anti_spam') && (
          <AntiSpamSection botId={botId} bot={bot} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} handleDeleteFeature={handleDeleteFeature} fetchBot={fetchBot} />
        )}

        {/* ANTI-FORWARD */}
        {enabledFeatures.includes('anti_forward') && (
          <AntiForwardSection botId={botId} bot={bot} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} handleDeleteFeature={handleDeleteFeature} fetchBot={fetchBot} />
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
