'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [brandName, setBrandName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoPreview, setLogoPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    checkSession()
    fetchSettings()
  }, [])

  const checkSession = async () => {
    const res = await fetch('/api/auth/session')
    if (!res.ok) router.push('/')
  }

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setBrandName(data.brandName || '')
        setLogoUrl(data.logoUrl || '')
        setLogoPreview(data.logoUrl || '')
      }
    } catch {}
    finally { setLoading(false) }
  }

  // Resize image to max 128x128 and compress to keep base64 small
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const reader = new FileReader()
      reader.onload = (ev) => {
        img.onload = () => {
          const maxSize = 128
          let w = img.width
          let h = img.height
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round((h * maxSize) / w); w = maxSize }
            else { w = Math.round((w * maxSize) / h); h = maxSize }
          }
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, w, h)
          // Compress as JPEG quality 0.8 (much smaller than PNG base64)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
          resolve(dataUrl)
        }
        img.onerror = () => reject(new Error('Gagal memuat gambar'))
        img.src = ev.target?.result as string
      }
      reader.onerror = () => reject(new Error('Gagal membaca file'))
      reader.readAsDataURL(file)
    })
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Max 2MB original (will be resized & compressed)
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file maksimal 2MB')
      return
    }

    try {
      const compressed = await resizeImage(file)
      setLogoPreview(compressed)
      setLogoUrl(compressed)
    } catch (err) {
      alert('Gagal memproses gambar')
    }
  }

  const handleRemoveLogo = () => {
    setLogoUrl('')
    setLogoPreview('')
  }

  const handleSave = async () => {
    setSaving(true)
    setSuccess('')
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName, logoUrl }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setSuccess('Berhasil disimpan!')
        // Update preview from server response
        if (data.logoUrl !== undefined) setLogoPreview(data.logoUrl)
        if (data.brandName !== undefined) setBrandName(data.brandName)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setSuccess('')
        alert('Gagal menyimpan: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      alert('Gagal menghubungi server. Coba lagi.')
    }
    finally { setSaving(false) }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
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
            {logoPreview && <img src={logoPreview} alt="Logo" className="w-8 h-8 rounded-full object-cover" />}
            <h1 className="text-base font-bold text-slate-800">{brandName || 'Rich Bot'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
              ← Dashboard
            </button>
            <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-red-500">Keluar</button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>⚙️</span> Profil Website
            </h2>
            <p className="text-xs text-slate-500 mt-1">Ubah nama merk dan logo panel admin</p>
          </div>

          <div className="px-5 py-5 space-y-5">
            {/* Brand Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Merk</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Rich Bot"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white"
              />
              <p className="text-[10px] text-slate-400 mt-1">Tampil di header, login, dan tab browser</p>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Logo</label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative">
                    <img src={logoPreview} alt="Logo" className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 shadow-sm" />
                    <button
                      onClick={handleRemoveLogo}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
                    <span className="text-slate-400 text-lg">📷</span>
                  </div>
                )}
                <div>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium rounded-lg transition-colors">
                    <span>📤</span> Upload Logo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1.5">PNG, JPG, WebP. Maks 2MB. Akan di-resize otomatis.</p>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Preview Header</p>
              <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-slate-200">
                {logoPreview && <img src={logoPreview} alt="Logo" className="w-7 h-7 rounded-full object-cover" />}
                <span className="text-sm font-bold text-slate-800">{brandName || 'Rich Bot'}</span>
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-xl transition-colors"
              >
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
              {success && <span className="text-xs text-emerald-600 font-medium">{success}</span>}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
