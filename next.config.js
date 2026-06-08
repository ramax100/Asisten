/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
// pro deploy trigger

// force redeploy 1780876126
// redeploy: add /spamdebug command + anti-spam send-time window
// redeploy: anti-spam sliding window (fix oscillating counter)
// redeploy: optimize anti-spam latency (fewer DB ops + parallel mute)
// redeploy: 3 variasi acak sapaan otomatis pagi/siang/sore/malam
// redeploy: panel multi-variasi sapaan (tampil 3 default + bisa tambah)
// redeploy: teks custom moderasi mute/unmute/kick/ban/unban
// redeploy: fitur kirim pesan bebas lewat panel
// redeploy: Kirim Pesan jadi halaman sidebar dengan pemilih bot
// redeploy: dukung kirim foto via upload di Kirim Pesan
// redeploy: sapaan 4 slot via webhook activity + dedup tahan seharian
// redeploy: fitur hapus bot
// redeploy: form buat bot dengan channel & grup opsional
