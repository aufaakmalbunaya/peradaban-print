# 🖨️ Peradaban Print

Ubah **Epson L300** (USB-only) menjadi printer pintar berbasis web: user upload PDF A4 → Anda setujui → **Raspberry Pi 5** mencetak otomatis. 100% gratis (GitHub + Vercel + Supabase).

```
User ─upload─▶  peradaban.moyudan.web.id/print   (statis @ Vercel)
                      │ simpan file + buat job
                      ▼
                SUPABASE  (Postgres + Storage)
              notif ▼            ▲ polling tiap 5 dtk
            Anda /admin   Raspberry Pi 5 ──USB──▶ Epson L300 (CUPS)
```

> **Kenapa Pi hanya "polling"?** Pi menarik pekerjaan dari cloud, jadi **tidak perlu IP publik, port forwarding, atau DDNS**. Cukup WiFi rumah biasa. Aman & gratis.

---

## Struktur folder

```
peradaban-print/
├─ index.html            # Landing page
├─ print/index.html      # /print — form upload + validasi A4
├─ status/index.html     # /status — lacak cetakan via kode
├─ admin/index.html      # /admin — dashboard persetujuan (login email)
├─ config.js             # ISI kredensial Supabase (aman utk publik)
├─ vercel.json           # clean URLs (/print bukan /print.html)
├─ assets/               # theme.css + JS tiap halaman
├─ supabase/schema.sql   # tabel, RLS, RPC, storage bucket
└─ pi/                   # worker Raspberry Pi
   ├─ worker.py
   ├─ peradaban-print.service
   └─ .env.example
```

---

## Langkah 1 — Supabase (database + storage)

1. Buat proyek gratis di [supabase.com](https://supabase.com).
2. **SQL Editor** → tempel isi `supabase/schema.sql` → **Run**.
   - Ganti `peradaban06@belibuku.link` di file itu dengan email admin Anda.
3. **Authentication → Providers → Email**: aktifkan (magic link sudah cukup).
4. **Project Settings → API**: catat `Project URL`, `anon key`, dan `service_role key`.

## Langkah 2 — Website (GitHub + Vercel)

1. Isi `config.js` dengan `SUPABASE_URL` + `SUPABASE_ANON_KEY` (aman dipublik).
2. Push folder ini ke repo GitHub.
3. Di [vercel.com](https://vercel.com): **Add New → Project** → import repo.
   - Framework preset: **Other** (situs statis, tanpa build).
4. **Settings → Domains** → tambahkan `peradaban.moyudan.web.id`, lalu ikuti
   instruksi DNS (tambah `CNAME` ke `cname.vercel-dns.com` di panel domain `.web.id`).
5. Selesai: `/print`, `/status`, `/admin` langsung aktif.

## Langkah 3 — Raspberry Pi 5 (printer)

```bash
# 1. Pasang CUPS + driver Epson ESC/P-R + Ghostscript
sudo apt update
sudo apt install -y cups printer-driver-escpr ghostscript
sudo usermod -aG lpadmin pi

# 2. Colok Epson L300 via USB, lalu daftarkan printer
#    Buka http://<ip-pi>:631  → Administration → Add Printer
#    Pilih L300, driver "Epson ... ESC/P-R", beri nama: EpsonL300
#    (atau lewat CLI:)
lpadmin -p EpsonL300 -E -v usb://EPSON/L300 -m everywhere
lpoptions -d EpsonL300 -o media=A4

# 3. Pasang worker
mkdir -p /home/pi/peradaban-print
cp pi/worker.py /home/pi/peradaban-print/
cp pi/.env.example /home/pi/peradaban-print/.env
nano /home/pi/peradaban-print/.env   # isi SERVICE_ROLE_KEY dsb

# 4. Jadikan service otomatis
sudo cp pi/peradaban-print.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now peradaban-print
journalctl -u peradaban-print -f   # lihat log
```

> **Tes cetak manual dulu:** `echo test | lp -d EpsonL300` sebelum menyalakan worker.

---

## Cara kerja “paksa A4”

File non-A4 **tidak ditolak** — otomatis disesuaikan ke ukuran A4:
1. **Browser** (`print.js` + pdf-lib): mendeteksi halaman non-A4 dan memberi tahu pemohon bahwa dokumen akan diskalakan ke A4.
2. **Raspberry Pi** (`worker.py` + Ghostscript): setiap dokumen dinormalisasi ke A4 (`-sPAPERSIZE=a4 -dPDFFitPage`) sebelum dicetak, plus `lp -o media=A4 -o fit-to-page` sebagai pengaman. Hasil cetak selalu A4.

## Alur status

`pending` → (Anda **Izinkan**) → `approved` → (Pi ambil) → `printing` → `done`
Atau: `pending` → (Anda **Tolak**) → `rejected` · gagal cetak → `failed`.

## Keamanan

- `service_role key` **hanya** di Pi (`.env`, tidak di-commit). Website cuma pakai `anon key`.
- RLS: publik hanya boleh **insert** permintaan + **upload** file; tidak bisa baca data orang lain.
- Pelacakan pakai RPC `get_job_status` (hanya balikan 1 kode, bukan seluruh tabel).
- File PDF diakses admin/Pi via **signed URL** yang kedaluwarsa 2 menit.

## Mode Demo

Selama `config.js` masih kosong, situs berjalan dalam **Mode Demo** (data contoh, tanpa backend) supaya bisa dipratinjau langsung. Isi kredensial untuk mengaktifkan mode nyata.

## Pengembangan lanjutan (opsional)

- **Notifikasi Telegram** saat ada permintaan (tombol Izinkan/Tolak dari HP).
- Konversi otomatis Word/gambar → PDF di Pi (`libreoffice --headless`).
- Indikator stok kertas & jam layanan.
