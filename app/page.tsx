'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [brandName, setBrandName] = useState('Rich Bot')
  const [logoUrl, setLogoUrl] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.brandName) setBrandName(d.brandName)
      if (d.logoUrl) setLogoUrl(d.logoUrl)
    }).catch(() => {})
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (res.ok) { router.push('/dashboard') }
      else { setError(data.error || 'Username atau password salah') }
    } catch (err) { setError('Gagal menghubungi server') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} className="w-16 h-16 mx-auto rounded-full object-cover mb-3 shadow-md" />
          ) : (
            <div className="w-16 h-16 mx-auto rounded-full bg-indigo-600 flex items-center justify-center mb-3 shadow-md">
              <span className="text-white text-xl font-bold">{brandName.charAt(0)}</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-slate-800">{brandName}</h1>
          <p className="text-slate-500 text-sm mt-1">Masuk ke panel admin</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white" placeholder="admin" required />
          </div>
          <div className="mb-5">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white" placeholder="********" required />
          </div>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl"><p className="text-red-600 text-xs">{error}</p></div>}
          <button type="submit" disabled={loading || !username || !password} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-xl">
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}
