# Telegram Bot Panel

Multi-bot Telegram management panel dengan fitur Force Join Channel. Deploy ke Vercel, online 24 jam.

## Fitur

- **Multi-bot** — Kelola beberapa bot Telegram dari 1 dashboard
- **Login via Token** — Akses panel menggunakan token BotFather
- **Force Join Channel** — User wajib join channel sebelum bisa kirim pesan di grup
- **Auto-detect Grup** — Grup otomatis terdeteksi saat bot ditambahkan sebagai admin
- **Webhook Mode** — Bot online 24/7 via Vercel serverless functions

## Deploy ke Vercel

### 1. Setup MongoDB Atlas

1. Buat akun di [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Buat cluster baru (free tier)
3. Buat database user dan dapatkan connection string
4. Whitelist IP `0.0.0.0/0` (untuk Vercel)

### 2. Deploy

1. Fork/push repository ini ke GitHub
2. Buka [Vercel](https://vercel.com) dan import repository
3. Set environment variables:

| Variable | Deskripsi |
|----------|-----------|
| `MONGODB_URI` | Connection string MongoDB Atlas |
| `SESSION_SECRET` | Random string minimal 32 karakter |
| `NEXT_PUBLIC_BASE_URL` | URL Vercel app (contoh: `https://app-kamu.vercel.app`) |

4. Deploy!

### 3. Setup Bot

1. Buka dashboard di URL Vercel Anda
2. Login dengan token bot dari BotFather
3. Tambahkan channel yang wajib di-join
4. Klik "Setup Webhook" untuk mengaktifkan bot
5. Tambahkan bot sebagai **admin** di grup Telegram (dengan izin hapus pesan)

## Cara Kerja Force Join

1. User kirim pesan di grup
2. Bot cek apakah user sudah join semua channel wajib
3. Jika belum → pesan dihapus + kirim warning dengan tombol join
4. User klik join channel → klik "Sudah Join" → bot verifikasi
5. Jika sudah join semua → warning dihapus, user bisa chat normal

## Tech Stack

- **Next.js 14** (App Router)
- **MongoDB** (Mongoose)
- **Tailwind CSS**
- **iron-session** (Cookie-based sessions)
- **Telegram Bot API** (Direct HTTP calls)

## Development

```bash
npm install
cp .env.example .env
# Edit .env dengan konfigurasi Anda
npm run dev
```

## Environment Variables

```env
MONGODB_URI=mongodb+srv://...
SESSION_SECRET=random-string-32-chars-minimum
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
```
