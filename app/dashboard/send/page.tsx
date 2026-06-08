'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface BotInfo {
  _id: string
  botId: string
  botUsername: string
  botName: string
  channels: any[]
  groups: { groupId: string; groupTitle: string }[]
  isActive: boolean
  webhookUrl: string
}

export default function SendMessagePage() {
  const router = useRouter()
  const [bots, setBots] = useState<BotInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBotId, setSelectedBotId] = useState('')
  const [target, setTarget] = useState('all')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => { checkSession(); fetchBots() }, [])

  const checkSession = async () => {
    const res = await fetch('/api/auth/session')
    if (!res.ok) router.push('/')
  }

  const fetchBots = async () => {
    try {
      const res = await fetch('/api/bots')
      if (res.ok) {
        const data = await res.json()
        setBots(data.bots)
        if (data.bots.length > 0) setSelectedBotId(data.bots[0].botId)
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleLogout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/') }

  const selectedBot = bots.find((b) => b.botId === selectedBotId)
  const groups = selectedBot?.groups || []

  // Reset target when switching bot
  useEffect(() => { setTarget('all'); setResult(null) }, [selectedBotId])

  const handleSend = async () => {
    if (!selectedBotId || !text.trim()) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch(`/api/bots/${selectedBotId}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, text }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setResult({ ok: true, msg: `Terkirim ke ${data.sent}/${data.total} grup.` })
        setText('')
      } else {
        setResult({ ok: false, msg: data.error || `Gagal kirim (${data.sent || 0}/${data.total || 0} berhasil).` })
      }
    } catch {
      setResult({ ok: false, msg: 'Gagal menghubungi server.' })
    }
    setSending(false)
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

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {/* ===== SIDEBAR ===== */}
      <aside className="hidden md:flex md:flex-col w-60 bg-white border-r border-slate-200 min-h-screen sticky top-0">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">B</div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">Bot Panel</p>
            <p className="text-[10px] text-slate-400 truncate">Kelola bot Telegram</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-2 mb-1">Menu Utama</p>
          <button onClick={() => router.push('/dashboard')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <span>📊</span> Dashboard
          </button>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-indigo-600 bg-indigo-50 font-medium">
            <span>📨</span> Kirim Pesan
          </button>

          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-2 mb-1 mt-4">Kelola</p>
          <button onClick={() => router.push('/dashboard')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <span>➕</span> Tambah Bot
          </button>
        </nav>
        <div className="px-3 py-4 border-t border-slate-100">
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors">
            <span>↩️</span> Keluar
          </button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h1 className="text-sm font-bold text-slate-800">📨 Kirim Pesan</h1>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="hidden md:block text-xl font-bold text-slate-800 mb-1">📨 Kirim Pesan</h1>
          <p className="text-xs text-slate-500 mb-5">Pilih bot, lalu kirim pesan bebas ke grup. Bot harus sudah berada di grup tujuan.</p>

          {bots.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center">
              <p className="text-slate-600 text-sm font-medium">Belum ada bot</p>
              <p className="text-slate-400 text-xs mt-1">Tambahkan bot terlebih dahulu di Dashboard</p>
            </div>
          ) : (
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-4 space-y-4">
                {/* Pilih Bot */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Pilih Bot Pengirim</label>
                  <select value={selectedBotId} onChange={(e) => setSelectedBotId(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white">
                    {bots.map((b) => (
                      <option key={b.botId} value={b.botId}>{b.botName} (@{b.botUsername}){b.isActive ? '' : ' — Off'}</option>
                    ))}
                  </select>
                </div>

                {/* Pilih Tujuan */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Tujuan</label>
                  {groups.length === 0 ? (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <p className="text-xs text-amber-700">Bot ini belum punya grup terdaftar. Tambahkan bot ke grup atau daftarkan grup lewat fitur Proteksi Grup.</p>
                    </div>
                  ) : (
                    <select value={target} onChange={(e) => setTarget(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white">
                      <option value="all">📢 Semua Grup ({groups.length})</option>
                      {groups.map((g) => (
                        <option key={g.groupId} value={g.groupId}>{g.groupTitle || g.groupId}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Isi Pesan */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Isi Pesan</label>
                  <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Tulis pesan yang ingin dikirim bot..." rows={6} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-slate-50 focus:bg-white" />
                  <p className="text-[10px] text-slate-400 mt-1">Mendukung format HTML: {'<b>tebal</b>'} {'<i>miring</i>'} {'<a href="url">teks</a>'}</p>
                </div>

                {result && (
                  <div className={`p-2.5 rounded-lg border ${result.ok ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <p className={`text-xs ${result.ok ? 'text-emerald-600' : 'text-red-600'}`}>{result.ok ? '✅ ' : '❌ '}{result.msg}</p>
                  </div>
                )}

                <button onClick={handleSend} disabled={sending || !text.trim() || groups.length === 0} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
                  <span>📨</span>{sending ? 'Mengirim...' : 'Kirim Pesan'}
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}
