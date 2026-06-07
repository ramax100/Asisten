# Telegram Bot Panel

Multi-bot Telegram management panel dengan fitur Force Join Channel. Deploy ke Vercel, online 24 jam.

---

## Fitur

- **Multi-bot** — Kelola beberapa bot Telegram dari 1 dashboard
- **Login via Token** — Akses panel menggunakan token BotFather
- **Force Join Channel** — User wajib join channel sebelum bisa kirim pesan di grup
- **Auto-detect Grup** — Grup otomatis terdeteksi saat bot ditambahkan sebagai admin
- **Webhook Mode** — Bot online 24/7 via Vercel serverless functions

---

## Panduan Lengkap Deploy

### LANGKAH 1: Buat Bot di Telegram

1. Buka Telegram, cari **@BotFather**
2. Kirim `/newbot`
3. Masukkan nama bot (contoh: `Asisten Grup`)
4. Masukkan username bot (contoh: `asisten_grup_bot`)
5. BotFather akan memberikan **token** seperti:
   ```
   123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```
6. **Simpan token ini** — nanti dipakai untuk login ke panel

---

### LANGKAH 2: Buat Database MongoDB Atlas (Gratis)

1. Buka https://www.mongodb.com/cloud/atlas
2. Klik **"Try Free"** → Buat akun (bisa pakai Google)
3. Setelah masuk, klik **"Build a Database"**
4. Pilih **FREE / M0 Sandbox** → Pilih region terdekat (Singapore) → Klik **"Create"**
5. Buat Database User:
   - Username: `botpanel`
   - Password: buat password (contoh: `MyPassword123`)
   - Klik **"Create User"**
6. Di bagian **"Where would you like to connect from?"**:
   - Klik **"Add My Current IP"**
   - **PENTING:** Juga tambahkan `0.0.0.0/0` (agar Vercel bisa akses)
   - Klik **"Finish and Close"**
7. Klik **"Connect"** → Pilih **"Drivers"**
8. Copy connection string, akan seperti ini:
   ```
   mongodb+srv://botpanel:MyPassword123@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
9. **Tambahkan nama database** setelah `.net/`:
   ```
   mongodb+srv://botpanel:MyPassword123@cluster0.xxxxx.mongodb.net/telegram-panel?retryWrites=true&w=majority
   ```
10. **Simpan connection string ini**

---

### LANGKAH 3: Deploy ke Vercel

1. Buka https://vercel.com → Login dengan akun GitHub
2. Klik **"Add New..."** → **"Project"**
3. Cari repository **"Asisten"** → Klik **"Import"**
4. Di halaman konfigurasi, buka bagian **"Environment Variables"**
5. Tambahkan 3 variabel berikut satu per satu:

   | NAME | VALUE |
   |------|-------|
   | `MONGODB_URI` | `mongodb+srv://botpanel:MyPassword123@cluster0.xxxxx.mongodb.net/telegram-panel?retryWrites=true&w=majority` |
   | `SESSION_SECRET` | `buatStringAcakMinimal32KarakterSepertiIni123456` |
   | `NEXT_PUBLIC_BASE_URL` | _(kosongkan dulu, isi setelah deploy)_ |

6. Klik **"Deploy"** → Tunggu sampai selesai (1-2 menit)
7. Setelah deploy berhasil, Anda akan mendapat URL seperti:
   ```
   https://asisten-xxxxx.vercel.app
   ```
8. **Copy URL tersebut**, lalu:
   - Buka **Settings** → **Environment Variables**
   - Tambah/edit `NEXT_PUBLIC_BASE_URL` dengan URL Anda:
     ```
     https://asisten-xxxxx.vercel.app
     ```
9. Buka tab **"Deployments"** → Klik **"⋮"** → **"Redeploy"**

---

### LANGKAH 4: Setup Bot di Panel

1. Buka URL Vercel Anda di browser (contoh: `https://asisten-xxxxx.vercel.app`)
2. Masukkan **token bot** yang didapat dari BotFather → Klik **"Login"**
3. Anda akan masuk ke **Dashboard**

---

### LANGKAH 5: Aktifkan Webhook

1. Di Dashboard, klik bot Anda
2. Klik tombol **"Setup Webhook"**
3. Jika muncul "Webhook berhasil diatur!" → Bot sudah online 24 jam!

---

### LANGKAH 6: Setup Force Join Channel

1. **Buat channel Telegram** (atau gunakan yang sudah ada)
2. **Tambahkan bot sebagai admin** di channel tersebut:
   - Buka Channel → Settings → Administrators → Add Admin → Cari bot Anda
3. Di panel dashboard, bagian **"Force Join Channel"**:
   - Ketik username channel (contoh: `@channelkamu`)
   - Klik **"Tambah"**

---

### LANGKAH 7: Proteksi Grup

1. **Tambahkan bot sebagai admin di grup** yang ingin diprotect:
   - Buka Grup → Settings → Administrators → Add Admin → Cari bot Anda
   - **WAJIB** aktifkan izin: ✅ Delete Messages
2. Bot akan otomatis mendeteksi grup dan mulai bekerja!

---

## Cara Kerja Force Join

```
User kirim pesan di grup
        │
        ▼
Bot cek: sudah join channel?
        │
   ┌────┴────┐
   │         │
   ▼         ▼
  ❌ NO     ✅ YES
   │         │
   ▼         ▼
Hapus      Pesan
pesan +    dibiarkan
kirim      (normal)
warning
   │
   ▼
User klik "Join Channel"
   │
   ▼
User klik "Sudah Join"
   │
   ▼
Bot verifikasi → ✅ Warning dihapus
```

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Login gagal "Token tidak valid" | Pastikan token dari BotFather benar, copy ulang |
| Webhook gagal | Pastikan `NEXT_PUBLIC_BASE_URL` sudah diisi dan sudah redeploy |
| Channel tidak ditemukan | Pastikan bot sudah ditambahkan sebagai admin di channel |
| Pesan tidak dihapus di grup | Pastikan bot menjadi admin di grup dengan izin "Delete Messages" |
| Panel tidak bisa dibuka | Cek apakah `MONGODB_URI` benar dan IP `0.0.0.0/0` sudah di-whitelist |

---

## Menambahkan Bot Kedua (Multi-bot)

1. Buat bot baru di @BotFather → Dapatkan token baru
2. Di dashboard, klik **"+ Tambah Bot"**
3. Masukkan token bot baru → Klik "Tambah"
4. Setup webhook dan channel untuk bot baru tersebut
5. Ulangi langkah 5-7 di atas

---

## Tech Stack

- **Next.js 14** (App Router)
- **MongoDB Atlas** (Mongoose ODM)
- **Tailwind CSS** (Dark theme)
- **iron-session** (Cookie-based sessions)
- **Telegram Bot API** (Direct HTTP calls)
- **Vercel** (Serverless deployment)

---

## Development Lokal

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env dengan konfigurasi Anda
# Lalu jalankan:
npm run dev
```

Buka http://localhost:3000

---

## Environment Variables

| Variable | Deskripsi | Contoh |
|----------|-----------|--------|
| `MONGODB_URI` | Connection string MongoDB | `mongodb+srv://user:pass@cluster.mongodb.net/telegram-panel` |
| `SESSION_SECRET` | Secret key untuk session (min 32 char) | `supersecretkeyyangsangatpanjang123` |
| `NEXT_PUBLIC_BASE_URL` | URL deployment Vercel | `https://asisten-xxx.vercel.app` |
