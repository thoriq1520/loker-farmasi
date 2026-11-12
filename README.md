# Loker Farmasi Bandung

Website React + Vite untuk mencari lowongan **D3 Farmasi di Bandung dan Cimahi**, terbaru lebih dulu.

## Menjalankan lokal

Memerlukan Node.js 22.12+ dan koneksi internet.

```sh
npm install
npm run dev
```

Buka **http://127.0.0.1:5173**. Satu perintah menjalankan tampilan dan pemeriksa sumber. Biarkan proses berjalan agar pembaruan otomatis tetap aktif walaupun tab browser ditutup.

Untuk versi build:

```sh
npm run build
npm start
```

Buka **http://127.0.0.1:4173**. `vite preview` tidak menjalankan API pemeriksa lowongan; gunakan `npm start`.

## Deploy ke Cloudflare

Cloudflare menjalankan pemeriksa dan menyajikan hasil di `GET /api/jobs`. Cron mengecek umur hasil tiap 5 menit dan memulai pemeriksaan ketika hasil berumur setidaknya 20 menit. Pemeriksa mengirim tiap bagian ke Durable Object terpisah dengan batas 45 request keluar, termasuk pengalihan. Hasil dari semua bagian disatukan di Workers KV. [Batas Workers](https://developers.cloudflare.com/workers/platform/limits/)

KitaLulus diperiksa per wilayah dengan maksimal 10 detail per wilayah. Jobstreet diperiksa terpisah untuk Bandung dan Cimahi dengan maksimal 25 detail per pencarian wilayah.

1. Push perubahan ke `main` pada repo yang terhubung ke Worker **`loker-farmasi`**. Cloudflare Workers Builds memakai `npm run build` dan `npx wrangler deploy`. Deploy produksi membuat Durable Object SQLite `JOB_COLLECTOR` dan memasang Cron. Binding KV `JOB_SNAPSHOTS` menyimpan daftar.
2. Buka **Settings → Trigger Events** untuk memeriksa jadwal `*/5 * * * *`. Perubahan jadwal dapat memerlukan hingga 15 menit untuk berlaku. Lihat waktu hasil terakhir di `/api/jobs`. [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)

Tombol **Muat ulang** membaca hasil terakhir. Cron memulai pengambilan dari sumber. GitHub dipakai oleh Workers Builds untuk mengambil kode. Jika sumber memberi `403` atau gagal dijangkau dari Cloudflare, hasil dari sumber tersebut dilewati.

## Data dan aturan

- Versi lokal memeriksa sumber saat aplikasi dimulai, lalu setiap **30 menit**. Tombol Perbarui meminta pemeriksaan tambahan dengan jeda minimum 60 detik. Permintaan bersamaan digabungkan.
- Sumber: halaman publik **KitaLulus**, **BIMMA Disnaker Kota Bandung**, **Glints**, **Jobstreet**, **Telegram**, **Farmacare**, **REDY**, **LokerBandung.id**, **Medion**, dan kanal rumah sakit Bandung di bawah. Pemeriksaan otomatis menggunakan data publik.
- Wilayah mencakup **Kota Bandung, Kabupaten Bandung, Kabupaten Bandung Barat, dan Cimahi**. Label `Bandung` tanpa kata `Kota` juga diterima. Lokasi di luar wilayah tersebut tetap disaring.
- Kualifikasi harus menyebut **D3 Farmasi** (termasuk D3/S1 dan Diploma III Farmasi). Pendidikan S1/profesi saja tidak diterima.
- Nama jabatan tidak dibatasi. **TTK, TVF, Asisten Apoteker, staf/admin farmasi, gudang/logistik, QC/QA, analis laboratorium, produksi, medical representative**, atau jabatan lain bisa masuk jika persyaratan pendidikannya menerima D3 Farmasi. Judul posisi saja tidak dianggap bukti pendidikan.
- Pencarian menggunakan 12 istilah pendidikan dan jabatan, termasuk **Tenaga Teknis Kefarmasian (TTK)** dan **Tenaga Vokasi Farmasi (TVF)**. Daftar jurusan seperti `D3/S1 Kimia, Analis Kimia, Farmasi` juga diperiksa; `D3 Kimia atau S1 Farmasi` tidak dianggap menerima D3 Farmasi.
- Lowongan portal harus aktif. Tanggal tutup yang tersedia wajib belum lewat. **Farmacare** dapat memakai status eksplisit `Aktif`; **Medion** memakai posisi yang masih tercantum di daftar resmi berstatus `publish` dengan pendaftaran tersedia; **LokerBandung.id** memakai halaman yang masih menyediakan lamaran tanpa penanda ditutup. Ketiganya boleh tidak mencantumkan tanggal tutup, yang ditampilkan sebagai **Belum diketahui**. Sumber portal lain tetap memerlukan tanggal tutup. Sesuai permintaan pengguna, temuan Telegram yang belum pasti boleh tampil dengan label **Perlu konfirmasi** meskipun tanggal tutup tidak tersedia. Lowongan yang eksplisit ditutup atau memiliki tanggal tutup yang sudah lewat tetap disembunyikan.
- Hasil diurutkan menurut tanggal tayang. Bila sumber hanya menyediakan tanggal pembaruan, tanggal itu dipakai dan diberi label **Diperbarui**.
- Semua hasil dan simpanan, termasuk Telegram, dibatasi **3 bulan kalender terakhir** menurut tanggal WIB. Pada 11 November 2026, batas awalnya 11 Agustus 2026 pukul 00.00 WIB. Batas bergerak otomatis setiap hari; tanggal tayang asli tetap dipakai meskipun posting lama diperiksa ulang. Pilihan 7, 14, dan 30 hari mempersempit rentang ini.
- Tanggal tutup tanpa jam berlaku sampai 23.59.59 WIB. Data hasil pemeriksaan berumur 30 menit otomatis disembunyikan sampai lolos pemeriksaan berikutnya.
- Sumber gagal diakses tidak memakai hasil lama. Status kegagalan terlihat di Status sumber; kegagalan akses dibedakan dari pencarian tanpa hasil.
- Tautan lamaran membuka halaman sumber asli. Simpanan hanya menyimpan ID di browser, tanpa akun. Lowongan yang tidak aktif tetap disembunyikan dari simpanan.

Jobstreet memakai layanan pencarian JSON situs dan detail publik yang menyertakan status serta tanggal tutup. Layanan ini teramati bisa diakses tanpa login pada pemeriksaan, tetapi bukan API mitra resmi dengan kontrak stabil; struktur atau aksesnya dapat berubah. Pencarian memakai D3 Farmasi, farmasi, TTK, dan TVF untuk lokasi Bandung dan Cimahi, lalu maksimal 50 detail terbaru diperiksa. Nama lokasi dari sumber dipertahankan agar wilayah penempatan terlihat.

Glints masih merespons halaman tantangan keamanan 403 pada pemeriksaan. Aplikasi menampilkan status dan tautan pencarian langsung, tanpa menganggap sumber itu terhubung. Indeed telah diperiksa terpisah dan masih terblokir; belum diintegrasikan sebagai sumber otomatis. Instagram dan LinkedIn juga belum diintegrasikan. Daftar tidak diisi data contoh ketika tidak ada hasil yang lolos.

Telegram membaca pratinjau publik [Loker Apoteker TTK](https://t.me/s/pharmacycareer), [Loker Bandung](https://t.me/s/lokerbandungid), dan [Loker Kimia](https://t.me/s/lokerkimia). Tiap kanal diperiksa pada halaman terbaru dan satu halaman pencarian Farmasi, lalu pesan dideduplikasi. Pesan yang menerima D3 Farmasi dan menyebut penempatan Bandung atau Cimahi dapat tampil sebagai **Perlu konfirmasi** tanpa tanggal tutup, selama tanggal tayangnya masih dalam 3 bulan terakhir. Tanggal tayang dan tautan pesan asli dipertahankan; tanggal tutup tidak ditebak dan perusahaan yang tidak diketahui ditulis demikian. Lokasi dibaca dari keterangan penempatan/lokasi, atau frasa daerah pada isi iklan; nama kanal saja tidak menjadi bukti wilayah. Status aktif tidak diklaim untuk temuan Telegram. Pesan yang jelas ditutup, kedaluwarsa, di luar wilayah, atau hanya menerima S1 tetap disembunyikan. Kartu dan detail membedakan temuan ini dari lowongan portal yang aktif; tombol membuka pesan Telegram asli. Tidak membuka tautan luar dari pesan. Poster tanpa teks, arsip lengkap, grup privat, dan informasi yang memerlukan login belum didukung.

Farmacare membaca tabel lokasi/pendidikan dan detail statusnya, termasuk saat situs mengirim HTML dalam pembungkus JSON. Bila hanya tanggal pembaruan yang disediakan, kartu berlabel **Diperbarui**. Medion membaca daftar karier resmi melalui WordPress REST publik, lalu memeriksa detail pendidikan dan lokasi; tanggal tayang asli tetap diutamakan dibanding perubahan halaman baru. LokerBandung.id membaca arsip Apoteker dan pencarian farmasi/TTK/TVF, mengabaikan rekomendasi umum, serta memisahkan pendidikan dan penempatan per posisi dalam iklan beberapa jabatan.

REDY membaca empat pencarian publik. Detail yang diperiksa belum menyediakan tanggal tayang dan status yang cukup untuk lolos aturan; tanggal `og:updated_time` yang berubah setiap permintaan tidak dipakai sebagai tanggal posting. Tidak ada tebakan tanggal dari ID lowongan. Sumber bisa berhasil terbaca dengan nol hasil yang memenuhi syarat.

Rincian pemeriksaan REA, bukti akses, dan jalur Jobstreet yang sudah diterapkan ada di [SOURCE_ACCESS.md](SOURCE_ACCESS.md).

Pengambilan data dibatasi pada halaman pencarian awal (12 kata kunci KitaLulus untuk empat wilayah, 12 kata kunci BIMMA, empat kata kunci Jobstreet untuk Bandung dan Cimahi), maksimal 40 detail KitaLulus, 30 BIMMA, 50 Jobstreet, serta 25 Glints per pemeriksaan. Kegagalan satu kata kunci tidak membuang hasil kata kunci lain yang berhasil diperiksa; sumber ditandai sebagian terbaca. Batas detail yang tercapai juga ditandai agar cakupan tidak terkesan lengkap. Glints dan BIMMA hanya menerima metadata `JobPosting` lengkap; Jobstreet membaca JSON data halaman publik. Detail tanpa metadata yang dapat diverifikasi disembunyikan. Cakupan bukan seluruh lowongan internet. Struktur halaman sumber dapat berubah; adapter harus disesuaikan jika itu terjadi.

Pemeriksaan detail Farmacare, REDY, LokerBandung.id, dan Medion dibatasi maksimal 30 per sumber, empat permintaan detail bersamaan. Medion membaca maksimal 100 posisi pada daftar publik. Farmacare memfilter wilayah, pendidikan, dan tanggal sebelum mengambil detail.

## Rumah sakit Bandung

| Rumah sakit | Kanal resmi | Pemeriksaan |
| --- | --- | --- |
| Santo Borromeus | [Karir](https://rsborromeus.com/careers/) | Daftar publik portal rekrutmen. Posisi tanpa tanggal tayang atau tutup dilewati. |
| Al Islam Bandung | [Karir](https://www.rsalislam.com/karir/) | Maksimal 20 posting terbaru dari kategori Karir. |
| Advent Bandung | [Artikel](https://rsadventbandung.com/articles), [Berita & Acara](https://rsadventbandung.com/news-program) | Halaman pertama setiap kanal. Artikel rekrutmen 2024 sudah lewat. |
| RSUP Dr. Hasan Sadikin | [Pengumuman](https://rshs.go.id/berita/pengumuman) | Maksimal 30 artikel terbaru dari situs resmi. |
| RSUD Kota Bandung | [Pengumuman](https://rsud.bandung.go.id/blog/blog-categories/pengumuman) | Pengumuman rekrutmen terbaru dengan kualifikasi dan tanggal dalam teks. |
| Santosa Bandung Central | [Karir](https://www.santosa-hospital.com/id/hospital/SHBC/carrer) | Cek langsung. Informasi yang ditemukan berupa poster. |
| Mayapada Hospital Bandung | [Karir Mayapada](https://mayapadahospital.darwinbox.com/ms/candidate/careers) | Cek langsung. Halaman publik yang terbaca belum memuat detail posisi. |
| Hermina Hospital Pasteur | [Karir Hermina](https://herminahospitals.com/id/careers), [portal pelamar](https://id-career.myworkplaze.com/hermina) | Cek langsung. Respons awal portal belum memuat detail posisi. |

Kanal otomatis diperiksa tiap 30 menit. Lowongan rumah sakit harus menerima D3 Farmasi, memiliki tanggal tayang dalam tiga bulan terakhir, dan masih menerima lamaran berdasarkan tanggal tutup. Kualifikasi atau tanggal yang hanya tersedia pada poster, lampiran PDF, atau setelah login belum terbaca. Tautan cek langsung tersedia di **Status sumber**.

## Pemeriksaan

```sh
npm test
npm run build
```

Tes mencakup batas wilayah dan pendidikan, kedaluwarsa, urutan terbaru, filter, parsing data publik, penggabungan refresh, serta pembuangan data sumber yang gagal diperiksa.

Untuk versi lokal, pembaruan berhenti ketika proses aplikasi atau komputer dimatikan. Untuk versi Cloudflare, pembaruan mengikuti Cron Trigger.
