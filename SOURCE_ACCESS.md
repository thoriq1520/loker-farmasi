# Pemeriksaan akses sumber lowongan

Diperiksa 11 November 2026. Catatan investigasi akses di bawah berasal dari pemeriksaan pukul **14.19 WIB**.

**Perluasan sumber pukul 15.16 WIB:** Farmacare, REDY, LokerBandung.id, Medion, serta portal RS Islam Jakarta Group sudah ditambahkan dan ikut diperiksa setiap 30 menit. API aktual menampilkan **21 lowongan**: Jobstreet 6, Farmacare 13, LokerBandung.id 2. Medion dan portal RS berhasil dibaca namun tidak menghasilkan lowongan yang memenuhi wilayah, pendidikan, dan usia posting; pencarian REDY tidak menghasilkan kandidat pada halaman yang diperiksa. Glints tetap 403. Bukti respons: `.cache/new-sources/live-result.json`.

Farmacare mengirim HTML biasa atau objek JSON berisi `content`; keduanya dibaca tanpa menjalankan JavaScript sumber. Delapan belas detail lokal terbaru diperiksa dan hasil ganda disaring menjadi 13. Farmacare menyatakan status `Aktif`; tanggal pembaruan diberi label **Diperbarui** dan tanggal tutup yang tidak dicantumkan tetap **Belum diketahui**. LokerBandung.id memisahkan jabatan pada iklan beberapa posisi agar pendidikan Farmasi dari satu jabatan tidak dipakai untuk jabatan lainnya. Medion memakai daftar WordPress REST yang ditautkan oleh halaman resmi dan detail persyaratan; posisi QC yang terbit 2025 tetap disembunyikan walaupun diperbarui November 2026, dan Production Foreman berlokasi Boyolali. Satu detail portal RS yang saat ini terbuka adalah Radiografer di Indramayu, sehingga tidak masuk hasil lokal Farmasi.

Detail lama REDY yang diperiksa memiliki persyaratan Farmasi namun tanpa tanggal tayang/batas lamaran yang dapat dipercaya. `og:updated_time` cocok dengan waktu permintaan, sehingga tidak dipakai untuk mengubah umur iklan. Cakupan sumber dibatasi halaman/daftar publik dan maksimal 30 detail per sumber baru; ini belum seluruh portal RS/apotek atau seluruh arsip masing-masing situs. Enam belas tes dan build lulus. Tes mencakup status tidak aktif, tanggal lampau, data JSON/HTML Farmacare, pemisahan jabatan dan wilayah, tanggal asli Medion, serta penolakan metadata waktu permintaan REDY.

**Pembaruan tampilan pukul 15.01 WIB:** pengguna mengizinkan temuan Telegram tanpa status aktif atau tanggal tutup yang pasti, dengan label **Perlu konfirmasi**, lalu membatasi seluruh hasil ke **3 bulan kalender terakhir**. Lokasi Bandung/Cimahi serta pendidikan D3 Farmasi tetap disaring; iklan yang jelas ditutup atau memiliki tanggal tutup lampau tetap disembunyikan. Tanggal pesan asli dipertahankan dan tanggal yang tidak diketahui tidak dibuat-buat. Dua temuan Telegram yang relevan berasal dari 2024 dan 2025, sehingga tidak tampil setelah batas usia diterapkan. Hasil aktual menjadi **6 lowongan Jobstreet, 0 Telegram**; semuanya berada dalam rentang sejak 11 Agustus 2026. Batas bergerak menurut tanggal WIB dan berlaku juga pada simpanan. Dua belas tes serta build lulus; API dan tampilan browser telah diperiksa. Respons aktual: `.cache/three-month-result.json`. Catatan sebelumnya di bawah bersifat historis.

**Pembaruan Telegram pukul 14.47 WIB:** sumber Telegram publik sudah ditambahkan dan mengikuti pemeriksaan otomatis 30 menit. Tiga kanal (`pharmacycareer`, `lokerbandungid`, `lokerkimia`) berhasil dibaca; 93 pesan unik diperiksa dari halaman terbaru dan pencarian Farmasi. Sebelas pesan yang menyebut pendidikan D3 Farmasi belum memiliki lokasi, perusahaan, atau tanggal tutup yang cukup jelas untuk ditampilkan; lima pesan tanpa teks belum dapat diperiksa. Nol hasil Telegram lolos, sementara total website tetap tujuh lowongan dari Jobstreet. Respons aktual tersimpan di `.cache/telegram/live-result.json`. Sepuluh tes dan build lulus. Informasi hanya pada poster, grup privat, dan format teks ambigu belum didukung; tanggal tutup tidak ditebak dari tanggal pesan.

**Pembaruan wilayah pukul 14.33 WIB:** atas permintaan pengguna, penyaring diperluas ke Bandung (termasuk kabupaten dan Bandung Barat) serta Cimahi. Label `Bandung` kini diterima tanpa harus membuktikan Kota Bandung. Pencarian Jobstreet mencakup Bandung dan Cimahi; KitaLulus mencari empat wilayah. Pemeriksaan terbaru membaca 40 detail Jobstreet dengan **7 lowongan lolos**. Sembilan tes dan build lulus. Respons aktual tersimpan di `.cache/bandung-cimahi-result.json`. Bukti REA dan uraian penyaring ketat di bawah dipertahankan sebagai catatan pemeriksaan sebelumnya.

| Sumber | Pengamatan | Hasil di website |
| --- | --- | --- |
| Jobstreet | Halaman pencarian HTML mendapat 403, tetapi layanan JSON pencarian situs merespons 200. Detail publik juga dapat dibaca. | Sudah terhubung melalui jalur publik yang berhasil diperiksa. |
| Glints | Permintaan biasa, browser REA, dan satu permintaan GraphQL pencarian publik masih mendapat 403/tantangan keamanan. | Belum berhasil terhubung. Status kegagalan dan tautan sumber ditampilkan. |
| Indeed | Permintaan biasa dan browser REA mendapat 403; browser menampilkan “Blocked - Indeed.com”. | Belum dimasukkan sebagai sumber otomatis. |

## Pemakaian REA

Tool MCP REA tidak tersedia dalam daftar tool sesi ini. Pemeriksaan registrasi melalui REA doctor menunjukkan konfigurasi Codex sudah selaras dengan REA 6.7.0; keadaan koneksi MCP aktif tidak dapat dipastikan. Konfigurasi tidak diubah.

Mesin REA tetap digunakan melalui CLI `rea-agents@6.7.0`, dengan cache paket terisolasi di `.cache/rea-npm`. `capture-browser-scenario` menjalankan Chrome dengan profil sementara milik pemeriksaan ini. Tidak memakai profil pribadi, login, cookie tersalin, token akun, proxy, atau pemalsuan sidik browser. Proses browser milik pemeriksaan ditutup setelah selesai. Tidak memasang Hopper/Ghidra karena target berupa situs web.

Hasil REA, termasuk DOM, aksesibilitas, dan metadata jaringan, disimpan lokal:

| Pemeriksaan | Berkas bukti | Evidence ID |
| --- | --- | --- |
| Glints, pencarian | [.cache/rea-public/glints/evidence.json](.cache/rea-public/glints/evidence.json) | `ev_cfe14b136ecf0939ff71e1f9068873137c9ee417fef39ae7d0b1af06d20fbfc2` |
| Jobstreet, pencarian | [.cache/rea-public/jobstreet/evidence.json](.cache/rea-public/jobstreet/evidence.json) | `ev_93c5cfb1424dff5099593f9732cdf43ab021c7f6d962befe8b25df0a65600de6` |
| Jobstreet, detail publik | [.cache/rea-public/jobstreet/detail-evidence.json](.cache/rea-public/jobstreet/detail-evidence.json) | `ev_d32688f522b97b58f386e9cbf01849e97f135f5652812287537384fcca2df0f5` |
| Indeed, pencarian | [.cache/rea-public/indeed/evidence.json](.cache/rea-public/indeed/evidence.json) | `ev_bda3ea58fd427037a5d63664a821151e83ecdbaf728cc6f5a51a006d52a97aec` |

Pengamatan pencarian Glints dan Jobstreet berlangsung enam detik; sebagian permintaan jaringan masih berjalan ketika rekaman berakhir. Hasilnya menunjukkan penolakan pada jendela pemeriksaan itu, bukan bukti semua jalur selalu tertutup. Rekaman Indeed selesai dengan halaman pemblokiran. Rekaman detail Jobstreet menunjukkan halaman lowongan biasa dan data terstruktur situs.

Respons layanan JSON Jobstreet diperiksa terpisah dengan permintaan HTTP biasa; pengamatan ini bukan keluaran REA. Metadata tersimpan di `.cache/rea-public/jobstreet/candidate-api-metadata.json`. Cuplikan hasil integrasi lokal ada di `.cache/rea-public/live-integration-result.json`.

## Perubahan Jobstreet yang diterapkan

Pencarian memakai `https://id.jobstreet.com/api/jobsearch/v5/search` dengan `siteKey=ID-Main`, lokasi `Bandung`, `sortMode=ListedDate`, empat kata kunci (D3 Farmasi, farmasi, TTK, TVF), serta halaman pertama berisi maksimal 30 hasil per kata kunci. Ini layanan situs yang teramati terbuka, bukan API mitra resmi dengan kontrak stabil. Akses atau formatnya dapat berubah.

ID hasil dideduplikasi dan maksimal 50 detail terbaru dibaca dari halaman publik `/id/job/{id}`. Parser hanya memakai `JSON.parse` pada nilai `window.SEEK_REDUX_DATA`; tidak menjalankan skrip jarak jauh. ID detail harus cocok dengan ID yang diminta.

Detail menyediakan persyaratan pendidikan, status `Active`, penanda `isExpired`, tanggal tayang, dan tanggal tutup. Semua tetap melewati penyaring yang sama. Label `Bandung` belum membuktikan Kota Bandung, sehingga baru diterima jika lokasi eksplisit Kota Bandung atau deskripsi menyatakan penempatan di Kota Bandung. Alamat kantor pusat saja tidak cukup. Kabupaten Bandung, Cimahi, dan lokasi lain tetap dikecualikan.

Pemeriksaan terakhir berhasil membaca **39 detail publik**. Enam detail yang menerima D3 Farmasi hanya menyebut Bandung dan disembunyikan. **Nol lowongan lolos semua kriteria** saat pemeriksaan; akses berhasil tidak berarti setiap kandidat memenuhi syarat. Hasil ini bukan cakupan seluruh lowongan Jobstreet karena pencarian dibatasi halaman pertama.

## Jalur lanjutan untuk sumber yang belum terbaca

Glints belum memiliki jalur pengambilan otomatis yang terbukti berhasil dalam pemeriksaan ini. Akses data dari penyedia atau feed yang disetujui perlu dikonfirmasi dengan Glints sebelum dapat dijanjikan. Situs tetap menyediakan tautan pencarian langsung.

Indeed memiliki MCP resmi untuk pencarian dan detail lowongan. Namun, dokumentasi yang diperiksa menyebutnya masih beta, hanya tersedia melalui Claude Connector, dan memerlukan masuk ke akun Indeed. Itu belum menjadi koneksi Indeed untuk website React lokal atau sesi Codex ini. Cakupan lowongan Indonesia juga belum diverifikasi. [Dokumentasi resmi Indeed MCP](https://docs.indeed.com/mcp).

API mitra SEEK memerlukan proses integrasi dan persetujuan tersendiri. Jalur publik Jobstreet yang digunakan di proyek ini tidak memakai kredensial API mitra tersebut. [Proses integrasi resmi SEEK](https://developer.seek.com/introduction).

## Verifikasi

Sembilan tes lulus dan build produksi berhasil. Tes meliputi pembacaan JSON tanpa mengeksekusi skrip, kecocokan ID, sebagian pencarian gagal, serta penolakan lokasi ambigu, Kabupaten Bandung, lowongan kedaluwarsa, dan persyaratan S1 saja. API lokal merespons 200 dengan status sumber dan hasil aktual. Pembaruan otomatis tetap setiap 30 menit selama proses aplikasi berjalan.
