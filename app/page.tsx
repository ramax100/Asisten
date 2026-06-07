'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await res.json()

      if (res.ok) {
        router.push('/dashboard')
      } else {
        setError(data.error || 'Token tidak valid')
      }
    } catch (err) {
      setError('Gagal menghubungi server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Telegram Bot Panel</h1>
          <p className="text-gray-400 mt-2">Masukkan token bot dari BotFather untuk login</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
          <div className="mb-4">
            <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-2">
              Bot Token
            </label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="123456789:ABCdefGHI..."
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              Dapatkan token dari <a href="https://t.me/BotFather" target="_blank" className="text-blue-400 hover:underline">@BotFather</a> di Telegram
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Memverifikasi...
              </span>
            ) : (
              'Login'
            )}
          </button>
        </form>

        {/* Info */}
        <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Cara mendapatkan token:</h3>
          <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
            <li>Buka <a href="https://t.me/BotFather" target="_blank" className="text-blue-400 hover:underline">@BotFather</a> di Telegram</li>
            <li>Kirim /newbot untuk membuat bot baru</li>
            <li>Ikuti instruksi dan dapatkan token</li>
            <li>Paste token di form di atas</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
