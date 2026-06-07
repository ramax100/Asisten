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
  const [addLoading, setAddLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    checkSession()
    fetchBots()
  }, [])

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
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBot = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddLoading(true)
    setError('')
    try {
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: newToken }),
      })
      const data = await res.json()
      if (res.ok) { setShowAddBot(false); setNewToken(''); fetchBots() }
      else { setError(data.error || 'Gagal menambahkan bot') }
    } catch (err) { setError('Gagal menghubungi server') }
    finally { setAddLoading(false) }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>Memuat...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Bot Panel</h1>
          <button onClick={handleLogout} style={{ fontSize: '12px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>Keluar</button>
        </div>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{bots.length}</p>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0' }}>Total Bot</p>
          </div>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', margin: 0 }}>{bots.filter(b => b.isActive).length}</p>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0' }}>Aktif</p>
          </div>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1', margin: 0 }}>{bots.reduce((a, b) => a + b.channels.length, 0)}</p>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0' }}>Channel</p>
          </div>
        </div>

        {/* Bot List Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#334155', margin: 0 }}>Daftar Bot</h2>
          <button onClick={() => setShowAddBot(true)} style={{ padding: '6px 14px', backgroundColor: '#4f46e5', color: 'white', fontSize: '12px', fontWeight: '500', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>+ Tambah Bot</button>
        </div>

        {/* Add Bot Modal */}
        {showAddBot && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '384px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 4px' }}>Tambah Bot Baru</h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px' }}>Paste token dari @BotFather</p>
              <form onSubmit={handleAddBot}>
                <input
                  type="text"
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value)}
                  placeholder="123456789:ABCdefGHI..."
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', backgroundColor: '#f8fafc', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' }}
                  required
                />
                {error && <p style={{ color: '#dc2626', fontSize: '12px', margin: '0 0 12px' }}>{error}</p>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => { setShowAddBot(false); setError('') }} style={{ flex: 1, padding: '10px', fontSize: '14px', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: 'white', cursor: 'pointer' }}>Batal</button>
                  <button type="submit" disabled={addLoading} style={{ flex: 1, padding: '10px', fontSize: '14px', color: 'white', backgroundColor: addLoading ? '#94a3b8' : '#4f46e5', border: 'none', borderRadius: '12px', cursor: addLoading ? 'not-allowed' : 'pointer' }}>{addLoading ? 'Memproses...' : 'Tambah'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bot List */}
        {bots.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 4px' }}>Belum ada bot</p>
            <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>Klik "Tambah Bot" untuk memulai</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {bots.map((bot) => (
              <div
                key={bot._id}
                onClick={() => router.push(`/dashboard/bot/${bot.botId}`)}
                style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: 0 }}>{bot.botName}</p>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>@{bot.botUsername}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '10px', fontWeight: '500', padding: '2px 6px', borderRadius: '4px', backgroundColor: bot.isActive ? '#ecfdf5' : '#fef2f2', color: bot.isActive ? '#10b981' : '#ef4444' }}>
                    {bot.isActive ? 'Aktif' : 'Off'}
                  </span>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0' }}>{bot.channels.length} ch &middot; {bot.groups.length} gr</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
