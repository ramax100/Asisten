'use client'

import { useEffect, useState } from 'react'

export default function WelcomePopup() {
  const [show, setShow] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')

  useEffect(() => {
    const dismissed = localStorage.getItem('welcome_popup_dismissed')
    if (!dismissed) {
      setShow(true)
    }
    // Ambil logo dari settings
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.logoUrl) setLogoUrl(d.logoUrl)
    }).catch(() => {})
  }, [])

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('welcome_popup_dismissed', '1')
    }
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] px-4" style={{ animation: 'fadeIn 0.2s ease-out' }}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 text-center" style={{ animation: 'fadeIn 0.2s ease-out' }}>
        {/* Logo */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full overflow-hidden shadow-md border-2 border-indigo-100">
          {logoUrl ? (
            <img src={logoUrl} alt="Rich Store" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-indigo-100 flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-slate-800 mb-2">
          Selamat Datang!
        </h2>

        {/* Message */}
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          Aplikasi ini dikembangkan oleh <b>Rich Store</b> — solusi bot Telegram terpercaya untuk manajemen grup Anda.
        </p>

        <p className="text-xs text-slate-500 mb-5">
          Dapatkan update terbaru, tips, dan support langsung dengan bergabung di channel Telegram kami.
        </p>

        {/* CTA Button */}
        <a
          href="https://t.me/ChRichStore"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl transition-colors mb-4 w-full justify-center"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.75 3.99-1.74 6.65-2.89 7.99-3.44 3.81-1.58 4.6-1.86 5.12-1.87.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .37z"/></svg>
          Gabung Channel Telegram
        </a>

        {/* Checkbox - Jangan tampilkan lagi */}
        <label className="flex items-center justify-center gap-2 mb-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <span className="text-xs text-slate-500">Jangan tampilkan lagi</span>
        </label>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="w-full py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          Tutup
        </button>
      </div>
    </div>
  )
}
