# Rich Bot - Telegram Bot Management Panel

Panel admin untuk mengelola multi-bot Telegram dengan berbagai fitur moderasi, anti-spam, welcome message, dan lainnya. Deploy ke Vercel dengan database MongoDB Atlas.

---

## Fitur

| Fitur | Keterangan |
|-------|------------|
| **Multi-Bot** | Kelola banyak bot Telegram dari satu panel |
| **Force Join** | Paksa member join channel sebelum bisa kirim pesan |
| **Welcome Message** | Sambut member baru dengan pesan custom |
| **Anti-Spam** | Auto-mute member yang spam (sliding window) |
| **Anti-Forward** | Larang forward pesan dari luar grup |
| **Banned Words** | Hapus pesan yang mengandung kata terlarang (whole-word match) |
| **Moderasi** | /mute, /unmute, /kick, /ban, /unban via reply, tag, atau user ID |
| **Greeting Otomatis** | Sapaan otomatis pagi/siang/sore/malam |
| **Kirim Pesan** | Broadcast pesan + foto ke grup dari panel |
| **Profil Website** | Ubah nama merk & upload logo dari dashboard |
| **Popup Welcome** | Pesan popup saat pertama kali buka website |
| **Diagnostik** | /spamdebug, /welcomedebug, /welcometest (admin only) |

---

## Deploy Sendiri (Untuk Pengguna Baru)

### Prasyarat

- Akun [MongoDB Atlas](https://www.mongodb.com/atlas) (gratis)
- Akun [Vercel](https://vercel.com/) (gratis)
- Bot Telegram (buat via [@BotFather](https://t.me/BotFather))

---

### Langkah 1: Fork Repository

Klik tombol **Fork** di kanan atas halaman GitHub ini.

---

### Langkah 2: Buat Database MongoDB Atlas (Gratis)

1. Buka [mongodb.com/atlas](https://www.mongodb.com/atlas) → daftar/login
2. Klik **Build a Database** → pilih **FREE (M0)**
3. Buat database user:
   - Klik **Database Access** → **Add New Database User**
   - Isi username & password (catat!)
   - Role: **Read and Write to Any Database**
4. Whitelist semua IP (agar Vercel bisa akses):
   - Klik **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`)
5. Dapatkan connection string:
   - Klik **Database** → **Connect** → **Drivers**
   - Copy string-nya, ganti `<password>` dengan password tadi
   - Contoh hasil: `mongodb+srv://user:pass123@cluster0.abc.mongodb.net/botpanel?retryWrites=true&w=majority`

---

### Langkah 3: Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) → login → **Add New Project**
2. Import repository yang sudah di-fork
3. Di halaman konfigurasi, tambahkan **Environment Variables**:

| Variable | Isi dengan | Keterangan |
|----------|-----------|------------|
| `MONGODB_URI` | `mongodb+srv://user:pass@...` | Connection string dari langkah 2 |
| `ADMIN_USERNAME` | `admin` | Username login panel (bebas) |
| `ADMIN_PASSWORD` | `password_kamu` | Password login panel (bebas) |

4. Klik **Deploy** → tunggu selesai
5. Buka URL yang diberikan Vercel → Login → Selesai!

---

### Langkah 4: Buat Bot Telegram

1. Buka [@BotFather](https://t.me/BotFather) di Telegram
2. Kirim `/newbot` → ikuti instruksi → catat **token**
3. Matikan privacy mode:
   - `/mybots` → pilih bot → **Bot Settings** → **Group Privacy** → **Turn off**
4. Buka panel admin Anda → klik **+ Tambah Bot** → paste token → selesai!

---

## Command Bot di Grup

| Command | Fungsi | Cara Pakai |
|---------|--------|------------|
| `/mute 1m` | Mute member | Reply/tag/ID |
| `/unmute` | Unmute member | Reply/tag/ID |
| `/kick` | Kick member | Reply/tag/ID |
| `/ban` | Ban member | Reply/tag/ID |
| `/unban` | Unban member | Reply/tag/ID |
| `/id` | Lihat user ID member | Reply pesan member |
| `/spamdebug` | Diagnostik anti-spam | Admin only |
| `/welcomedebug` | Diagnostik welcome | Admin only |
| `/welcometest` | Test welcome message | Admin only |

**Format moderasi:**
```
/mute 1m              → reply pesan member
/mute 123456789 1m    → pakai user ID langsung
/mute [tag member] 1m → tag dari suggestion list
```

**Format durasi:** `30s` (detik), `5m` (menit), `1h` (jam), `1d` (hari)

---

## Struktur Project

```
├── app/
│   ├── api/
│   │   ├── auth/          # Login, logout, session
│   │   ├── bots/          # CRUD bot, channels, features
│   │   ├── cron/          # Greeting otomatis
│   │   ├── settings/      # Profil website (nama & logo)
│   │   └── webhook/       # Handler webhook Telegram
│   ├── dashboard/
│   │   ├── bot/[botId]/   # Detail & pengaturan bot
│   │   ├── send/          # Kirim pesan broadcast
│   │   └── settings/      # Profil website
│   ├── layout.tsx
│   ├── page.tsx           # Halaman login
│   └── WelcomePopup.tsx   # Popup welcome
├── lib/
│   ├── models/            # Mongoose models
│   ├── mongodb.ts         # Database connection
│   ├── baseUrl.ts         # URL resolver
│   └── greetings.ts       # Greeting logic
├── .env.example           # Template env variables
├── next.config.js
├── package.json
└── vercel.json
```

---

## Environment Variables

| Variable | Wajib | Default | Keterangan |
|----------|:-----:|---------|------------|
| `MONGODB_URI` | **Ya** | - | MongoDB Atlas connection string |
| `ADMIN_USERNAME` | Tidak | `admin` | Username login panel |
| `ADMIN_PASSWORD` | Tidak | `@Admin001002` | Password login panel |
| `NEXT_PUBLIC_BASE_URL` | Tidak | auto-detect | Base URL (opsional) |

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Bot tidak merespon | Pastikan bot admin di grup + privacy mode OFF |
| Welcome tidak muncul | Jalankan `/welcomedebug` atau klik Fix Webhook |
| Anti-spam tidak jalan | Admin dikecualikan (by design). Cek `/spamdebug` |
| Webhook error | Klik **Fix Semua Bot** di dashboard |
| Login gagal | Cek ADMIN_USERNAME dan ADMIN_PASSWORD di env |
| Database error | Cek MONGODB_URI dan whitelist IP di Atlas |

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** MongoDB Atlas + Mongoose
- **Styling:** Tailwind CSS
- **Hosting:** Vercel
- **Bot API:** Telegram Bot API

---

## Lisensi

MIT License - bebas digunakan, dimodifikasi, dan didistribusikan.

---

## About

Aplikasi ini dibuat oleh **Rich Store** — solusi bot Telegram terpercaya.

Untuk update, tips, dan support:

**Channel Telegram:** [@ChRichStore](https://t.me/ChRichStore)
