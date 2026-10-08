# ViewOnce Thief

Bot WhatsApp pribadi untuk menyimpan foto, video, dan audio sekali-lihat dari HP kamu sendiri. File disimpan di `data/`, dibuka lewat `localhost:3456`.

Dokumentasi ini fokus ke Termux (Android). Nama sama, pakai Bahasa Indonesia.

## Yang kamu butuh

- HP dengan Termux. Bukan Termux dari Play Store versi usang.
- Node.js 22 atau lebih baru. Cek: `node -v`
- Akun WhatsApp milikmu sendiri.

Pasang deps alat bantu:

```bash
pkg update
pkg install nodejs git
```

Kalau `node -v` masih 18, pakai:

```bash
pkg install nodejs-lts
```

## Mulai cepat di Termux

```bash
npm install
node index.js
```

Pertama kali tanpa folder `sessions/`:

1. Pilih `y` untuk pairing code atau `n` untuk QR.
2. Pairing code: masukkan nomor seperti `628123456789`.
3. QR: scan di WhatsApp, tab Perangkat Tertaut.

Setelah muncul `BOT AKTIF`, jangan tutup terminal. Biarkan terus.

Pakai wake lock agar HP tidak tidur:

```bash
termux-wake-lock
```

Boleh juga jalan di belakang dengan `pm2`:

```bash
npm i -g pm2
pm2 start index.js --name vvthief
pm2 save
pm2 startup
```

## Cara kerja simpan ViewOnce

1. Seseorang mengirim foto/video/audio sekali-lihat.
2. Reply pesan itu dengan teks apa saja. `ok`, `save`, bebas.
3. Bot mengunduh dari salinan reply (yang berisi kunci dekripsi) lalu menulis file ke `data/viewonce/`.
4. Chatmu sendiri menerima `ViewOnce <tipe> tersimpan lokal (id N). Buka: http://localhost:3456`.
5. Buka `http://localhost:3456` di Chrome HP. Terbaru di atas. Foto tampil langsung, video/audio pakai player bawaan.

Kalau medianya sudah dibuka di HP lain dulu, kunci hangus. Error closed-session berarti minta pengirim kirim ulang.

## Dashboard lokal

- Otomatis nyala saat bot terhubung. URL: `http://localhost:3456`.
- Diganti port: `DASH_PORT=3000 node index.js`.
- File: `data/viewonce/<timestamp>_<rand>.jpg|mp4|ogg`
- Index: `data/local.db`, tabel `media_items` dan `inbox`.
- Panel admin: KPI total/foto/video/audio, cari, filter Semua/Foto/Video/Audio, buka, unduh, hapus.
- Pengaturan bot lewat toggle di dashboard. Setiap ON/OFF langsung tulis `config.json`.
- Pesan masuk yang dulu tampil di terminal, sekarang jadi bubble chat di panel "Pesan masuk". Grup punya badge grup.
- Bot mati atau HP restart? File di `data/` tetap ada. Hilang hanya kalau kamu hapus folder `data/` manual.

## Perintah WhatsApp

Kirim dari nomormu sendiri. Awalan `.` `#` `!` `/` semua bisa.

| Perintah | Fungsi |
|---|---|
| `#menu` | Menu ringkas dan status ON/OFF |
| `#info` | Status lengkap, daftar, URL dashboard |
| `#on <fitur>` / `#off <fitur>` | Nyalakan/matikan |
| `#add blacklist 62812...` | Blokir nomor dari story |
| `#add whitelist 62812...` | Izinkan hanya daftar |
| `#remove blacklist 62812...` | Hapus dari daftar |
| `#add emojis 👍` | Tambah emoji reaksi |
| `#remove emojis 👍` | Hapus emoji reaksi |
| `#backup` | Paksa backup sesi ke `sessions_backup/` |
| `#vo` / `#vv` | Alias simpan ViewOnce |

Fitur yang bisa di-toggle: `autoread` `autolike` `dlmedia` `sensornomor` `antitelpon` `kickstory` `antidelete`. Semuanya tersimpan di `config.json`.

Sensor nomor default OFF. Kalau mau nomor disamarkan lagi, toggle "Samarkan nomor" di dashboard atau `#on sensornomor`.

## Struktur

```
index.js            entry
src/
  connect.js        koneksi Baileys, health check, mulai dashboard
  handlers.js       routing pesan, trigger ViewOnce, perintah
  viewonce.js       unduh dan simpan ViewOnce
  dashboard.js      http server lokal, admin CMS, bubble inbox
  localdb.js        SQLite + file storage
  commands.js       #menu #info #on/#off #add/#remove #backup #vo
  status.js         story handling opsional, mati secara default
  media.js          helper media Baileys
  session.js        backup ringan
  logger.js         log ke terminal penting saja lalu data/inbox.json untuk chat
config.json         feature flags, daftar
sessions/           auth Baileys, gitignored
data/               media + db, gitignored
```

## Catatan

- Jangan commit `sessions/`, `data/`, `logs/`.
- Jangan bagikan `sessions/`. Itu login WhatsApp-mu.
- Jika `440` tiga kali: `rm -rf sessions`, pairing ulang, lalu hapus perangkat tertaut lama di WhatsApp.
- Error closed-session berarti ViewOnce kedaluwarsa. Minta pengirim kirim ulang.

MIT. Pakai untuk pribadi dan hormat pengirim.
