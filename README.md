# ViewOnce Thief

Save WhatsApp view-once photos, videos, and voice notes to your own machine. No cloud, no database service, no login. One file database, one local page in Chrome.

> **EN** — English documentation first. **ID** — Dokumentasi Indonesia di bawah.

---

## English

### What it does

A personal WhatsApp bot that runs on your own device or server. When someone sends a view-once, you reply that message with any text and the bot downloads the media to `data/viewonce/` and records it in `data/local.db`. You open `http://localhost:3456` in Chrome to review it. Nothing leaves your machine.

### Features

- **ViewOnce capture** — reply a view-once with any text → saved locally. Also `#vo` / `#vv` / `#viewonce` while quoting.
- **Local dashboard** — `http://localhost:3456` lists every saved item with sender, time, and caption. Click to open the original file. No auth, no internet.
- **Offline storage** — files on disk + `node:sqlite` (Node 22 builtin). Falls back to `data/local.json` if SQLite is unavailable.
- **Story helpers (optional)** — auto read, auto like, media download, number masking, anti-call, auto-kick for group story mentions.
- **Light on Termux** — no heavy dependencies, 12-hour session backup, 2 MB log rotation.

### Requirements

- Node.js 22 or newer (`node:sqlite` is used). Check with `node -v`.
- A WhatsApp account you own. The bot uses your session.

### Quick start

```bash
npm install
node index.js
```

First run without `sessions/`:

1. Choose `y` for pairing code or `n` for QR.
2. Pairing code: enter your number as `62xxxxxxxxxx`. Enter the code shown in WhatsApp.
3. QR: scan with WhatsApp → Linked devices.

After `BOT AKTIF` appears, keep the terminal alive. On Termux run `termux-wake-lock` first, see `TERMUX_GUIDE.md`.

### How ViewOnce saving works

1. Someone sends you a view-once photo/video/audio.
2. **Reply** that message with any text (`ok`, `save`, anything).
3. The bot downloads from the quoted copy (contains the decryption keys) and writes the file.
4. Your own chat receives `ViewOnce <type> tersimpan lokal (id N). Buka: http://localhost:3456`.
5. Open `http://localhost:3456` — newest first, image inline, video and audio with native players.

Do not open the view-once on another phone first, and reply quickly. Once opened elsewhere the keys expire.

### Commands

Send these from your own WhatsApp (prefix `.` `#` `!` `/` all work):

| Command | Effect |
|---|---|
| `#menu` | Short menu and current ON/OFF state |
| `#info` | Full status: features, black/whitelist, emoji list, dashboard URL |
| `#on <feature>` / `#off <feature>` | Toggle. Features: `autoread` `autolike` `dlmedia` `sensornomor` `antitelpon` `kickstory` `antidelete` |
| `#add blacklist 62812...` | Block a number from story handling |
| `#add whitelist 62812...` | Allow only listed numbers (empty = allow all) |
| `#remove blacklist 62812...` | Remove from list |
| `#add emojis 👍` / `#remove emojis 👍` | Manage reaction emoji pool |
| `#backup` | Force session backup to `sessions_backup/` (max 3, auto every 12 h if changed) |
| `#vo` / `#vv` | Alias for ViewOnce: quote a view-once and send `#vo` |
| `ViewOnce reply` | Reply any view-once with any text — the main capture method |

All lists and toggles are persisted in `config.json`.

### Local dashboard

- Starts automatically when the bot connects. URL: `http://localhost:3456`.
- Port can be changed: `DASH_PORT=3000 node index.js`.
- Files: `data/viewonce/<timestamp>_<rand>.jpg|mp4|ogg`
- Index: `data/local.db` table `media_items`
- On Termux, open Chrome on the same phone → `http://localhost:3456`.

### Project layout

```
index.js            entry
src/
  connect.js        Baileys connection, health check, dashboard start
  handlers.js       message routing, ViewOnce trigger, command dispatch
  viewonce.js       download and save ViewOnce media
  dashboard.js      tiny http server for the local gallery
  localdb.js        SQLite + file storage
  commands.js       #menu #info #on/#off #add/#remove #backup #vo
  status.js         optional story handling (disabled by default)
  media.js          Baileys media helpers
  session.js        light backup
config.json         feature flags, lists
sessions/           Baileys auth (gitignored)
data/               saved media + db (gitignored)
```

### Notes

- Do not commit `sessions/`, `data/`, `logs/`.
- Do not share `sessions/` — it is your WhatsApp login.
- If you see `440` three times: `rm -rf sessions` then pair again and remove the old linked device in WhatsApp.
- Closed-session errors mean the view-once expired — ask the sender to resend.

---

## Indonesia

### Untuk apa

Bot WhatsApp pribadi yang berjalan di HP atau server milikmu. Ketika ada yang mengirim foto/video sekali-lihat, kamu balas pesan itu dengan teks apa saja, bot akan mengunduh medianya ke `data/viewonce/` dan mencatatnya di `data/local.db`. Buka `http://localhost:3456` di Chrome untuk melihatnya. Tidak ada data yang keluar dari perangkatmu.

### Fitur

- **Simpan ViewOnce** — balas sekali-lihat dengan teks apa pun → tersimpan lokal. Alternatif `#vo` / `#vv` sambil quote.
- **Dashboard lokal** — `http://localhost:3456` menampilkan semua item terbaru dengan pengirim, waktu, dan caption. Klik untuk buka file asli. Tanpa login, tanpa internet.
- **Penyimpanan offline** — file di disk + `node:sqlite` bawaan Node 22. Jika SQLite tidak tersedia, fallback ke `data/local.json`.
- **Helper story (opsional)** — auto read, auto like, download media story, sensor nomor, anti-telpon, auto-kick yang tag grup di story.
- **Ringan di Termux** — tanpa dependensi berat, backup sesi 12 jam, rotasi log 2 MB.

### Kebutuhan

- Node.js 22 atau lebih baru. Cek `node -v`.
- Akun WhatsApp milikmu sendiri.

### Mulai cepat

```bash
npm install
node index.js
```

Saat `sessions/` belum ada:

1. Pilih `y` untuk pairing code atau `n` untuk QR.
2. Pairing code: masukkan nomor `62xxxxxxxxxx`. Masukkan kode yang muncul di WhatsApp.
3. QR: scan di WhatsApp → Perangkat tertaut.

Setelah muncul `BOT AKTIF`, biarkan terminal tetap hidup. Di Termux jalankan `termux-wake-lock` dulu, lihat `TERMUX_GUIDE.md`.

### Cara kerja ViewOnce

1. Seseorang mengirim foto/video/audio sekali-lihat.
2. **Balas** pesan itu dengan teks apa saja (`ok`, `save`, bebas).
3. Bot mengunduh dari salinan quote (yang membawa kunci dekripsi) dan menulis file.
4. Chat milikmu menerima `ViewOnce <tipe> tersimpan lokal (id N). Buka: http://localhost:3456`.
5. Buka `http://localhost:3456` — terbaru di atas, gambar tampil langsung, video dan audio pakai player bawaan.

Jangan buka sekali-lihat di HP lain dulu dan balas secepatnya. Sekali dibuka di tempat lain, kuncinya hangus.

### Perintah

Kirim dari WhatsApp milikmu sendiri (awalan `.` `#` `!` `/` semua bisa):

| Perintah | Fungsi |
|---|---|
| `#menu` | Menu ringkas dan status ON/OFF |
| `#info` | Status lengkap: fitur, blacklist/whitelist, daftar emoji, URL dashboard |
| `#on <fitur>` / `#off <fitur>` | Nyalakan/matikan. Fitur: `autoread` `autolike` `dlmedia` `sensornomor` `antitelpon` `kickstory` `antidelete` |
| `#add blacklist 62812...` | Blokir nomor dari handling story |
| `#add whitelist 62812...` | Hanya izinkan nomor terdaftar (kosong = izinkan semua) |
| `#remove blacklist 62812...` | Hapus dari daftar |
| `#add emojis 👍` / `#remove emojis 👍` | Atur kumpulan emoji reaksi |
| `#backup` | Paksa backup sesi ke `sessions_backup/` (maks 3, otomatis tiap 12 jam jika berubah) |
| `#vo` / `#vv` | Alias ViewOnce: quote sekali-lihat lalu kirim `#vo` |
| `Balas ViewOnce` | Balas sekali-lihat dengan teks apa pun — metode utama |

Semua daftar dan toggle tersimpan di `config.json`.

### Dashboard lokal

- Jalan otomatis saat bot terhubung. URL: `http://localhost:3456`.
- Ganti port: `DASH_PORT=3000 node index.js`.
- File: `data/viewonce/<timestamp>_<rand>.jpg|mp4|ogg`
- Index: `data/local.db` tabel `media_items`
- Di Termux, buka Chrome di HP yang sama → `http://localhost:3456`.

### Struktur proyek

Lihat diagram di bagian English — sama.

### Catatan

- Jangan commit `sessions/`, `data/`, `logs/`.
- Jangan bagikan `sessions/` — itu login WhatsApp-mu.
- Jika `440` tiga kali: `rm -rf sessions` lalu pairing ulang dan hapus perangkat tertaut lama di WhatsApp.
- Error closed-session berarti sekali-lihat sudah kedaluwarsa — minta pengirim kirim ulang.

---

MIT — built for personal use. Use responsibly and respect the sender.
