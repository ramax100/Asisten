'use client'

import { useEffect, useState } from 'react'

export default function LoadingCat() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    // Hilangkan loading setelah halaman selesai dimuat
    const timer = setTimeout(() => setShow(false), 1500)
    return () => clearTimeout(timer)
  }, [])

  if (!show) return null

  return (
    <div className="loading-overlay">
      <div className="loading-content">
        {/* Kucing berjalan CSS */}
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
}
