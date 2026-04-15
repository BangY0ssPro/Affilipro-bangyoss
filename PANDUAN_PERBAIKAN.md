# 🔧 PANDUAN PERBAIKAN — AffiliPRO di Vercel

---

## 🚨 Ringkasan Masalah yang Ditemukan

| # | File | Masalah | Dampak |
|---|------|---------|--------|
| 1 | `js/config.js` | `backendMode: "appscript"` — app pakai Apps Script, bukan Vercel | Data input **tidak pernah masuk ke Vercel** |
| 2 | `js/config.js` | `vercelBase: "PASTE_VERCEL_URL_DISINI"` — URL Vercel belum diisi | API Vercel tidak bisa dipanggil |
| 3 | `vercel.json` | Private key & kredensial rahasia tersimpan di file kode | **Bahaya keamanan** — kunci bocor ke Git/publik |

---

## ✅ LANGKAH PERBAIKAN (Ikuti Urutan Ini)

---

### LANGKAH 1 — Hapus Credentials dari `vercel.json` (Keamanan)

File `vercel.json` kamu sebelumnya menyimpan `GOOGLE_PRIVATE_KEY` dan email service account langsung di dalam kode. Ini sangat berbahaya jika file diunggah ke GitHub/GitLab.

**Sudah diperbaiki di file ini.** Sekarang kamu perlu memasukkan credentials ke Vercel Dashboard secara manual.

**Cara memasukkan Environment Variables di Vercel:**

1. Buka [vercel.com/dashboard](https://vercel.com/dashboard)
2. Klik nama proyek kamu (`affilipro-bangyoss`)
3. Klik **Settings** → **Environment Variables**
4. Tambahkan satu per satu variabel berikut:

| Key | Value |
|-----|-------|
| `SPREADSHEET_ID` | `1X1dbDPXniV8ycIkQ6bue_PSbFieBAxpRYav1Hg68cPo` |
| `GOOGLE_CLIENT_EMAIL` | `affilisheetintegrated@affilisheetintegrated.iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | Isi dengan private key kamu (copy dari file lama, termasuk `-----BEGIN PRIVATE KEY-----` sampai `-----END PRIVATE KEY-----`) |
| `DRIVE_FOLDER_ID` | `15z6wzHSBnP43YsjKV9K59Wax-R7zuU3Q` |

> ⚠️ **Pastikan `GOOGLE_PRIVATE_KEY` menggunakan newline nyata, bukan `\n` literal.**
> Di Vercel Dashboard, kamu bisa paste langsung dengan baris baru — Vercel akan menyimpannya dengan benar.

5. Klik **Save** dan pilih environment: **Production, Preview, Development** (centang semua)

---

### LANGKAH 2 — Cari URL Vercel Proyek Kamu

1. Buka [vercel.com/dashboard](https://vercel.com/dashboard)
2. Klik proyek `affilipro-bangyoss`
3. Di halaman utama proyek, lihat bagian **Domains** — contoh: `affilipro-bangyoss.vercel.app`
4. Catat URL ini, akan dipakai di Langkah 3

---

### LANGKAH 3 — Edit `js/config.js`

Buka file `js/config.js` dan pastikan 2 baris ini sudah benar:

```js
// Baris 1: Ubah dari "appscript" ke "vercel"
backendMode: "vercel",  // ✅ sudah diperbaiki di file ini

// Baris 2: Isi dengan URL Vercel kamu (tanpa slash di akhir)
vercelBase: "https://affilipro-bangyoss.vercel.app",  // ✅ ganti dengan URL asli kamu
```

> **Cara cepat:** Cari teks `affilipro-bangyoss.vercel.app` di file `config.js`,
> ganti dengan domain Vercel proyek kamu yang sebenarnya.

---

### LANGKAH 4 — Deploy Ulang ke Vercel

**Opsi A — Via GitHub (Otomatis):**
1. Commit dan push file yang sudah diperbaiki ke GitHub
2. Vercel akan otomatis redeploy

**Opsi B — Via Vercel CLI (Manual):**
```bash
# Install Vercel CLI jika belum ada
npm install -g vercel

# Masuk ke folder proyek
cd /folder/proyek/kamu

# Deploy
vercel --prod
```

---

### LANGKAH 5 — Verifikasi API Berjalan

Setelah deploy, buka browser dan akses URL ini (ganti dengan domain kamu):

```
https://affilipro-bangyoss.vercel.app/api/sheets?range=Product!A1:B5
```

**Respons yang benar:**
```json
{ "ok": true, "data": [...], "headers": [...] }
```

**Jika ada error**, lihat log di: Vercel Dashboard → Proyek → **Functions** → klik function yang error → lihat **Logs**

---

## 🔍 Penjelasan Teknis Mengapa Data Tidak Muncul

```
SEBELUM PERBAIKAN:
[Browser Input] → API.write() → backendMode = "appscript"
                                      ↓
                          Panggil Apps Script URL
                          (Vercel tidak disentuh sama sekali!)

SETELAH PERBAIKAN:
[Browser Input] → API.write() → backendMode = "vercel"
                                      ↓
                          POST ke vercelBase/api/sheets
                                      ↓
                          Vercel Serverless Function
                                      ↓
                          Google Sheets API → Data tersimpan ✅
```

---

## ❓ Troubleshooting Umum

| Gejala | Penyebab | Solusi |
|--------|----------|--------|
| Data tidak tersimpan | `backendMode` masih `"appscript"` | Ubah ke `"vercel"` di config.js |
| Error 500 di `/api/sheets` | Env variable belum diset di Vercel | Ikuti Langkah 1 |
| Error "GOOGLE_PRIVATE_KEY invalid" | Private key format salah | Pastikan key mengandung newline nyata, bukan `\\n` |
| CORS error di browser | `vercelBase` salah URL | Periksa URL di config.js, tidak boleh ada trailing slash |
| Halaman tidak bisa dibuka | Vercel belum di-deploy ulang | Lakukan deploy ulang (Langkah 4) |

---

## 📋 Checklist Sebelum Deploy

- [ ] `vercel.json` sudah tidak mengandung private key / credentials
- [ ] Environment Variables sudah diset di Vercel Dashboard (4 variabel)
- [ ] `backendMode` di `config.js` sudah `"vercel"`
- [ ] `vercelBase` di `config.js` sudah diisi URL Vercel yang benar
- [ ] Deploy ulang sudah dilakukan
- [ ] Test API `/api/sheets?range=Product!A1:B3` berhasil mengembalikan JSON

---

*Panduan ini dibuat berdasarkan analisis file proyek AffiliPRO.*
