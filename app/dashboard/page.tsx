'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface BotInfo {
  _id: string
  botId: string
  botUsername: string
  botName: string
  channels: any[]
  groups: any[]
  isActive: boolean
  webhookUrl: string
}

export default function DashboardPage() {
  const [bots, setBots] = useState<BotInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddBot, setShowAddBot] = useState(false)
  const [newToken, setNewToken] = useState('')
  const [newChannel, setNewChannel] = useState('')
  const [newGroup, setNewGroup] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [error, setError] = useState('')
  const [brandName, setBrandName] = useState('Rich Bot')
  const [logoUrl, setLogoUrl] = useState('')
  const router = useRouter()

  useEffect(() => { checkSession(); fetchBots(); fetchSettings() }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        if (data.brandName) setBrandName(data.brandName)
        if (data.logoUrl) setLogoUrl(data.logoUrl)
      }
    } catch {}
  }

  const checkSession = async () => {
    const res = await fetch('/api/auth/session')
    if (!res.ok) router.push('/')
  }

  const fetchBots = async () => {
    try { const res = await fetch('/api/bots'); if (res.ok) { const data = await res.json(); setBots(data.bots) } }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleAddBot = async (e: React.FormEvent) => {
    e.preventDefault(); setAddLoading(true); setError('')
    try {
      const res = await fetch('/api/bots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: newToken, channelUsername: newChannel, groupId: newGroup }) })
      const data = await res.json()
      if (res.ok) { setShowAddBot(false); setNewToken(''); setNewChannel(''); setNewGroup(''); fetchBots() } else { setError(data.error || 'Gagal') }
    } catch (err) { setError('Gagal menghubungi server') }
    finally { setAddLoading(false) }
  }

  const handleLogout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/') }

  // Delete bot
  const [deletingId, setDeletingId] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState('')

  const handleDeleteBot = async (botId: string) => {
    setDeletingId(botId)
    try {
      const res = await fetch(`/api/bots/${botId}`, { method: 'DELETE' })
      if (res.ok) { setConfirmDeleteId(''); fetchBots() }
      else { const data = await res.json(); alert(data.error || 'Gagal menghapus bot') }
    } catch { alert('Gagal menghubungi server') }
    finally { setDeletingId('') }
  }

  // Fix All Bots
  const [fixing, setFixing] = useState(false)
  const [fixResult, setFixResult] = useState<any>(null)

  const handleFixAll = async () => {
    setFixing(true)
    setFixResult(null)
    try {
      const res = await fetch('/api/bots/fix-all', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setFixResult(data)
        fetchBots()
      } else {
        setFixResult({ error: data.error })
      }
    } catch (err) {
      setFixResult({ error: 'Gagal menghubungi server' })
    } finally {
      setFixing(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="loading-content">
        <div className="cat">
          <div className="cat-body">
            <div className="cat-head">
              <div className="cat-ear cat-ear-left"></div>
              <div className="cat-ear cat-ear-right"></div>
              <div className="cat-face">
                <div className="cat-eye cat-eye-left"></div>
                <div className="cat-eye cat-eye-right"></div>
                <div className="cat-nose"></div>
              </div>
            </div>
            <div className="cat-tail"></div>
            <div className="cat-leg cat-leg-front-left"></div>
            <div className="cat-leg cat-leg-front-right"></div>
            <div className="cat-leg cat-leg-back-left"></div>
            <div className="cat-leg cat-leg-back-right"></div>
          </div>
        </div>
        <p className="loading-text">Memuat...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">{brandName.charAt(0)}</span>
              </div>
            )}
            <h1 className="text-base font-bold text-slate-800">{brandName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard/settings')} className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1">
              <span>⚙️</span> Profil
            </button>
            <button onClick={() => router.push('/dashboard/send')} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              <span>📨</span> Kirim Pesan
            </button>
            <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-red-500">Keluar</button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
            <p className="text-2xl font-bold text-slate-800">{bots.length}</p>
            <p className="text-xs text-slate-500 mt-1">Total Bot</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
            <p className="text-2xl font-bold text-emerald-600">{bots.filter(b => b.isActive).length}</p>
            <p className="text-xs text-slate-500 mt-1">Aktif</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
            <p className="text-2xl font-bold text-indigo-600">{bots.reduce((a, b) => a + b.channels.length, 0)}</p>
            <p className="text-xs text-slate-500 mt-1">Channel</p>
          </div>
        </div>

        {/* Diagnostik - Fix All */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔧</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Diagnostik</p>
                <p className="text-[10px] text-slate-500">Perbaiki webhook semua bot sekaligus</p>
              </div>
            </div>
            <button onClick={handleFixAll} disabled={fixing} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-medium rounded-lg">
              {fixing ? 'Memperbaiki...' : 'Fix Semua Bot'}
            </button>
          </div>
          {fixResult && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
              {fixResult.error ? (
                <p className="text-xs text-red-500">{fixResult.error}</p>
              ) : (
                <div>
                  <p className="text-xs text-slate-700 font-medium mb-1">Hasil: {fixResult.fixed}/{fixResult.total} bot berhasil di-fix</p>
                  {fixResult.results?.map((r: any, i: number) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span>{r.status === 'ok' ? '✅' : '❌'}</span>
                      <span>@{r.username}</span>
                      {r.status === 'error' && <span className="text-red-400">- {r.error}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Daftar Bot</h2>
          <button onClick={() => setShowAddBot(true)} className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg">+ Tambah Bot</button>
        </div>

        {showAddBot && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-slate-200 shadow-xl">
              <h3 className="text-sm font-bold text-slate-800 mb-1">Tambah Bot Baru</h3>
              <p className="text-xs text-slate-500 mb-4">Paste token dari @BotFather. Channel & grup opsional (bisa diisi nanti).</p>
              <form onSubmit={handleAddBot}>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Token BotFather *</label>
                <input type="text" value={newToken} onChange={(e) => setNewToken(e.target.value)} placeholder="123456789:ABCdefGHI..." className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3 font-mono" required />

                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Channel Telegram (opsional)</label>
                <input type="text" value={newChannel} onChange={(e) => setNewChannel(e.target.value)} placeholder="@usernamechannel" className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-1" />
                <p className="text-[10px] text-slate-400 mb-3">Bot harus jadi admin di channel. Mengaktifkan Force Join otomatis.</p>

                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Grup Telegram / ID (opsional)</label>
                <input type="text" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="-1001234567890" className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-1 font-mono" />
                <p className="text-[10px] text-slate-400 mb-3">Bot harus sudah ada di grup. Dapatkan ID dari <a href="https://t.me/getidsbot" target="_blank" className="text-indigo-500 hover:underline">@getidsbot</a>.</p>

                {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setShowAddBot(false); setError(''); setNewChannel(''); setNewGroup('') }} className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Batal</button>
                  <button type="submit" disabled={addLoading} className="flex-1 py-2.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-xl">{addLoading ? '...' : 'Tambah'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {bots.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center">
            <p className="text-slate-600 text-sm font-medium">Belum ada bot</p>
            <p className="text-slate-400 text-xs mt-1">Klik "Tambah Bot" untuk memulai</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bots.map((bot) => (
              <div key={bot._id} className="bg-white rounded-xl p-4 border border-slate-200 hover:border-indigo-300 flex items-center justify-between gap-3">
                <div onClick={() => router.push(`/dashboard/bot/${bot.botId}`)} className="flex-1 cursor-pointer min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{bot.botName}</p>
                  <p className="text-xs text-slate-500 truncate">@{bot.botUsername}</p>
                </div>
                <div onClick={() => router.push(`/dashboard/bot/${bot.botId}`)} className="text-right cursor-pointer">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${bot.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>{bot.isActive ? 'Aktif' : 'Off'}</span>
                  <p className="text-xs text-slate-400 mt-1">{bot.channels.length} ch · {bot.groups.length} gr</p>
                </div>
                {confirmDeleteId === bot.botId ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => handleDeleteBot(bot.botId)} disabled={deletingId === bot.botId} className="text-[10px] bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white px-2 py-1 rounded">{deletingId === bot.botId ? '...' : 'Hapus'}</button>
                    <button onClick={() => setConfirmDeleteId('')} className="text-[10px] text-slate-400 hover:text-slate-600 px-1">Batal</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDeleteId(bot.botId)} title="Hapus bot" className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
