GATE: OPEN 28 (rounds used up)

Website lokal React + Vite sudah dibuat. Pemeriksaan desain masih memiliki temuan terbuka; laporan ini bukan klaim bahwa seluruh aturan desain telah dipenuhi.

**Palet pilihan pengguna, 11 November 2026:** palet three-stones/olive awal diganti berdasarkan referensi eksplisit pengguna: biru `#55A4CA`, hijau `#91C042`, putih `#FFFFFF`, oranye `#EC6608`, abu-abu `#525252`. Biru dipakai pada tombol dan identitas; hijau pada indikator aktif dan badge jumlah hasil; oranye pada peringatan; abu-abu pada teks. Latar serta warna teks sekunder memakai tint/shade dari palet agar terbaca. Tombol biru memakai teks gelap karena putih di atas biru referensi tidak cukup kontras. Ikon tab dan theme-color ikut diperbarui.

Build berhasil. Browser memperlihatkan kelima nilai warna dasar sesuai referensi, tombol utama dengan latar rgb(85,164,202), badge dengan latar rgb(145,192,66), dan 21 kartu hasil. Tidak ada overflow horizontal pada viewport pemeriksaan. Tujuh pasangan warna teks/latar yang digunakan diperiksa numerik dan semuanya mencapai 4,5:1; tombol 4,87:1, badge 6,34:1. Rincian: `.cache/palette-contrast.json`; pratinjau nyata: `.cache/palette-preview.png`. Tidak mengulang seluruh pemeriksaan desain atau mengubah kit. Temuan historis di bawah tetap terbuka; uraian palet lama hanya menjelaskan pembangunan awal.

**Pembersihan teks antarmuka, 11 November 2026:** sesuai permintaan pengguna, slogan, paragraf promosi, kicker, kotak penjelasan aturan, daftar tautan sumber kedua, dan footer berulang dihapus. Dialog sumber kini berisi nama, status, jumlah lowongan, waktu pemeriksaan, serta tautan sumber; catatan parser/JSON/batas pengambilan tetap berada di dokumentasi dan tidak ditampilkan ke pengguna. Toast, error, loading, dan empty state diringkas. Gaji, jenis kerja, dan pengalaman yang tidak diketahui tidak ditampilkan sebagai placeholder; batas lamaran yang belum diketahui dan label Telegram “Perlu konfirmasi” tetap tersedia. Isi lowongan dari pemberi kerja dan tabel Farmacare dipertahankan. CSS untuk bagian yang dihapus ikut dibersihkan.

Build lulus. Pemeriksaan browser: 21 kartu tetap tampil, pencarian Padasuka dengan Enter menghasilkan satu kartu, detail tetap memiliki tabel tujuh baris, dan dialog menampilkan sepuluh sumber dengan ringkasan baru. Pemeriksaan salinan HTML hasil render tidak menemukan slogan/placeholder yang ditargetkan. Copy-lint: 0 FAIL, 1 WARN (`copy-stat-strip`) untuk angka jumlah hasil nyata pada filter, dipertahankan karena membantu memilih sumber. Tidak menambah tes unit untuk perubahan copy; pemeriksaan desain menyeluruh tidak diulang. Pratinjau: `.cache/copy-cleanup.png`; HTML yang diperiksa: `.cache/copy-cleanup-rendered.html`. Temuan desain historis di bawah tetap terbuka. Voice saat ini: fakta singkat dalam bahasa Indonesia; satu keterangan untuk satu keputusan pengguna.

**Perbaikan detail Farmacare, 11 November 2026:** pasangan label/nilai kini disimpan terstruktur dan dirender sebagai tabel HTML dengan header baris, bukan teks panjang. Baris tanpa nilai serta teks tautan peta tanpa aksi tidak ditampilkan. K-24 Padasuka diperiksa melalui API dan browser: tujuh baris berisi jenis usaha, perusahaan, posisi, pendidikan, kota, tanggal pembaruan, serta status. Pemeriksaan ponsel 390px menunjukkan lebar tabel dan scrollWidth sama-sama 278px, tanpa kelebihan lebar tabel. Tampilan desktop dan ponsel dilihat langsung; viewport dikembalikan sesudah pemeriksaan. Enam belas tes dan build lulus. Pratinjau: `.cache/new-sources/farmacare-table-desktop.png` dan `.cache/new-sources/farmacare-table-mobile.png`. Temuan desain historis di bawah tetap terbuka.

**Lima sumber tambahan, 11 November 2026 pukul 15.16 WIB:** Farmacare, REDY, LokerBandung.id, Medion, dan portal RS Islam Jakarta Group ditambahkan. API aktual menghasilkan 21 hasil yang lolos penyaring bersama dan terurut terbaru: 6 Jobstreet, 13 Farmacare, 2 LokerBandung.id. Sumber lain belum memiliki hasil yang cocok; Glints masih 403. Seluruh sepuluh pilihan sumber terlihat di browser. Filter Farmacare memperlihatkan 13 hasil; detail Pasfarma memperlihatkan pendidikan D3 Farmasi, Kabupaten Bandung, status dari sumber, label tanggal pembaruan asli, tanggal tutup “Belum diketahui”, serta tautan Farmacare asli. Pratinjau: `.cache/new-sources/farmacare-preview.png`. Enam belas tes dan build lulus, termasuk parser respons JSON/HTML dan pemisahan syarat per jabatan. Cakupan dan batas pengambilan dijelaskan di README.md dan SOURCE_ACCESS.md. Pemeriksaan desain menyeluruh tidak diulang; temuan historis di bawah tetap terbuka.

**Pembaruan Telegram dan usia posting, 11 November 2026 pukul 15.01 WIB:** pengguna mengizinkan temuan Telegram tanpa batas lamaran/status yang pasti, dengan label “Perlu konfirmasi” pada kartu serta detail dan tautan ke pesan asli. Tanggal yang tidak diketahui ditulis “Belum diketahui”. Seluruh sumber serta simpanan kini dibatasi tiga bulan kalender terakhir berdasarkan tanggal WIB; tanggal tayang asli tidak diganti tanggal pemeriksaan. API aktual menghasilkan enam lowongan portal; dua pesan Telegram yang relevan dari 2024/2025 tersembunyi oleh batas usia. Dua belas tes dan build lulus, termasuk batas tanggal inklusif, akhir bulan, tahun kabisat, pergantian tahun WIB, serta pengecualian Telegram yang tidak melonggarkan portal lain. Tampilan browser memperlihatkan enam hasil, pilihan “3 bulan terakhir”, dan Telegram nol. Tidak mengulang pemeriksaan desain menyeluruh.

**Pembaruan Telegram, 11 November 2026 pukul 14.47 WIB:** sumber Telegram ditambahkan melalui pratinjau tiga kanal publik tanpa akun. API aktual merespons 200; 93 pesan unik berhasil dibaca. Sebelas pesan D3 Farmasi dengan data tidak lengkap disembunyikan, lima pesan tanpa teks belum diperiksa, dan tidak ada hasil Telegram yang lolos seluruh kriteria. Total website tetap tujuh lowongan. Sepuluh tes dan build lulus, termasuk parser Telegram, tanggal asli, tautan asli, serta penolakan pesan kedaluwarsa, ditutup, tanpa tanggal tutup, dan di luar wilayah. Tampilan menggunakan komponen sumber yang sudah ada; pemeriksaan desain menyeluruh tidak diulang.

**Pembaruan wilayah, 11 November 2026 pukul 14.33 WIB:** sesuai permintaan pengguna, Bandung tanpa label Kota, Kabupaten Bandung, Bandung Barat, dan Cimahi kini diterima. Pencarian sumber dan teks antarmuka mengikuti wilayah baru. API aktual menghasilkan tujuh lowongan dari 40 detail Jobstreet; sembilan tes dan build lulus. Temuan desain historis di bawah tetap terbuka.

Tangkapan terbaru pada lebar 1440px dan 390px telah dilihat langsung: judul wilayah serta tujuh kartu lowongan tampil dan teks panjang membungkus dalam kartu. Berkas: `.taste-skill/shots/bandung-cimahi-1440.png` dan `.taste-skill/shots/bandung-cimahi-390.png`. Pemeriksaan desain menyeluruh tidak diulang untuk perubahan wilayah ini.

**Pembaruan akses sumber, 11 November 2026 pukul 14.19 WIB:** Jobstreet kini dibaca melalui pencarian JSON situs dan detail publik. Sebanyak 39 detail berhasil diperiksa; enam lokasi yang menerima D3 Farmasi hanya menyebut Bandung sehingga disembunyikan. Nol lowongan lolos seluruh kriteria. Glints masih 403 dan Indeed yang diperiksa terpisah belum terhubung. Sembilan tes serta build lulus. REA digunakan melalui CLI karena tool MCP-nya tidak tersedia di sesi; bukti dan batas pemeriksaan ada di SOURCE_ACCESS.md. Perubahan backend ini tidak mengubah temuan desain di bawah, yang berasal dari pemeriksaan tampilan sebelumnya.

**Pembaruan cakupan pencarian, 11 November 2026:** nama jabatan tidak lagi menjadi penyaring awal. Pencarian KitaLulus dan BIMMA memakai 12 istilah, termasuk TTK, TVF, nama panjang keduanya, serta D3/Diploma III Farmasi. Glints diarahkan ke pencarian pendidikan yang lebih luas. Persyaratan pendidikan dari detail menjadi penentu, termasuk bila Farmasi adalah salah satu dari beberapa jurusan yang diterima. Tujuh tes dan build lulus; pemeriksaan API lokal setelah perubahan merespons 200 dan masih menghasilkan 0 lowongan terverifikasi. Perubahan ini hanya menyentuh pencarian, penyaringan, tes, dan dokumentasi; hasil pemeriksaan visual di bawah berasal dari pembangunan awal.

**Hasil fungsi dan data**

- Sembilan tes fungsi lulus, termasuk batas kota/pendidikan/status/tanggal, urutan dan filter, parsing data publik termasuk teks streaming dan JSON Jobstreet, penggabungan refresh dan kegagalan sumber, serta pembaruan berkala tanpa browser.
- Build produksi berhasil. Server produksi diuji: halaman utama, modul animasi, dan /api/jobs merespons 200; alamat yang tidak ada merespons 404.
- Tanggal tayang tanpa jam dimulai 00.00 WIB; tanggal tutup tanpa jam berlaku sampai 23.59.59,999 WIB. Hasil berumur 30 menit atau gagal diperiksa disembunyikan.
- Pemeriksaan sumber terakhir: 11 November 2026 pukul 14.19 WIB. 0 lowongan lolos. Tidak ada data contoh dalam daftar.
- Sumber dibatasi halaman pencarian awal. Ini bukan cakupan seluruh internet. LinkedIn, Instagram, dan Telegram belum diintegrasikan.

| Sumber | Hasil pemeriksaan | Lowongan lolos |
| --- | --- | --- |
| KitaLulus | Daftar dan status lowongan berhasil diperiksa. | 0 |
| BIMMA Bandung | Bursa kerja Kota Bandung berhasil diperiksa. | 0 |
| Glints | Akses otomatis dibatasi (403). | 0 |
| Jobstreet | Pencarian JSON dan 39 detail publik terbaca; enam lokasi hanya menyebut Bandung dan disembunyikan. | 0 |

**Tampilan dan kinerja**

- Tampilan 1440×900, 1024×768, 820×1180, 768×1024, dan 390×844 diperiksa; tidak ada scroll horizontal menurut pengukuran layout. Kelima tangkapan layar penuh dari shoot.mjs dilihat langsung.
- Pemeriksaan akhir lulus untuk kontras, area sentuh, label kontrol, urutan heading, fokus, tab index, tumpang tindih, dan elemen keluar layar. Pemeriksaan 320px juga dijalankan oleh gate.
- Pemeriksaan penuh sebelumnya mencakup reduced motion dan hover. Gate akhir menjalankan pemeriksaan ringkas; tidak semua skenario interaksi diulang di putaran terakhir.
- Uji kinerja build pada desktop dan ponsel: 0 FAIL, 0 WARN. Transfer sekitar 350 KiB; LCP laboratorium relatif 200 ms desktop dan 288 ms ponsel, layout shift 0,024 dan 0,000. Ini bukan ukuran kecepatan internet pengguna. Pengukuran kinerja dilakukan sebelum perubahan kecil pada perhitungan tanggal; perubahan itu telah diuji dan dibangun ulang.
- Tangkapan PNG dari skrip layout tidak valid; pemeriksaan visual menggunakan tangkapan dari shoot.mjs. Data pengukuran layout tetap tersedia.
- Belum ada lowongan nyata yang lolos untuk menguji alur detail, simpan, dan lamaran sepenuhnya melalui browser. Logika filter/simpanan diuji dengan data khusus pengujian. Ukuran 375px, orientasi ponsel mendatar, dan pembesaran teks maksimal belum diuji khusus.

**Arah desain dan adaptasi**

Jenis: software, alat pencarian kerja lokal. Palet three-stones dengan olive dan latar stone dipilih oleh dealer; tipografi Geist/Geist Mono, radius soft. Voice: fakta langsung dalam bahasa Indonesia. Nama LokerFarmasi bersifat deskriptif, tanpa klaim nama/domain unik.

Hero split, latar efek, counter-rolls, bagian satu layar penuh, dan footer satu layar tidak diterapkan. Antarmuka pencarian langsung dipertahankan supaya hasil tidak tertutup bagian promosi. Tidak ada shader, scene, counter dekoratif, stok foto, logo pihak ketiga tiruan, testimoni, atau angka hasil rekaan. Lapisan hover/press dan entrance berasal dari kit animasi yang disalin tanpa perubahan.

Ini penyesuaian ruang lingkup terhadap aplikasi pencarian. Akibatnya, pemeriksa halaman promosi masih menandai tinggi hero/footer, moment, grid 12 kolom, root React, dan posisi kolom sidebar. Temuan tersebut tetap terbuka, tanpa waiver formal dan tanpa memodifikasi atau menyembunyikan pemeriksa.

Tidak ada fakta lowongan, kontak, harga, alamat jalan, foto, atau waktu pembukaan bisnis yang diasumsikan. Tidak ada formulir kontak atau alamat email stand-in. Domain canonical belum diperlukan karena pengguna memilih lokal. share.jpg berasal dari tangkapan antarmuka sendiri. Tidak ada foto/art atau client slot yang perlu disuplai.

**Peringatan yang dipertahankan**

- Copy-lint: 0 FAIL, 1 WARN, copy-stat-strip. Empat angka nol adalah jumlah hasil nyata pada filter sumber, bukan klaim pencapaian pemasaran.
- Peringatan bahasa tombol, pengulangan aksi, panjang copy, grid/tepi kolom, ukuran teks pendukung, dan skip-link dipertahankan dalam konteks antarmuka aplikasi. Skip-link menuju #top tersedia sebagai kontrol fokus pertama; beberapa aturan pemeriksa mengasumsikan struktur kit dan label bahasa Inggris.
- ID WARN akhir: nav, fold-cut, copy-buttons, copy-actions, off-grid, centre-axis, body-size, section-gaps, copy-length, one-screen, moment-none, skip-link, action-repeat, form-fields.

**Semua temuan desain yang masih terbuka**

| Pemeriksaan | Lebar | Elemen | Temuan |
| --- | --- | --- | --- |
| hero-fill | 1440 | main#top > div.wrap.workspace > aside.filters "Filter lowongan Reset Sumber lowongan Se" | the next section shows on the first screen: it starts at 477px on a 900px screen (the hero ends at 441px) |
| flush | 1440 | div#filter-fields > div.scope-note "Fokus di kotamu Cimahi, Kabupaten Bandun" | aside.filters and div#results run together: -782px between their content, on one ground |
| no-visual | 1440, 390 | main#top > section.search-hero.hero "Loker D3 Farmasi di Kota Bandung." | no picture, effect or mock in this section; a feature section needs a visual |
| moment-none | 1440 | (the page) | a software page (--type) deals no moment: every kind carries one, two on a long page (moments.md) |
| hero-screen | 1440 | main#top > section.search-hero.hero "Karier kesehatan, lebih dekatKota Bandun" | the hero ends at 441px on a 900px screen, 459px above the fold: it ends at the fold, 1px either way (SR-1) |
| hero-screen | 1440 | main#top > div.wrap.workspace "Filter lowonganBuka filterResetSumber lo" | 459px of the next section shows on the first screen (from 441px on a 900px screen): nothing below the hero shows at load (SR-1) |
| section-height | 1440 | div#root > footer.site-footer "LokerFarmasi.D3 Farmasi. Kota Bandung.Pe" | the section is 93px tall (0.1 screens), 807px short of one screen (900px): every section after the hero is one screen or two, 2px either way (SR-2) |
| section-height | 1440 | main#top > div.wrap.workspace "Filter lowonganBuka filterResetSumber lo" | the section is 878px tall (1 screens), 22px short of one screen (900px): every section after the hero is one screen or two, 2px either way (SR-2) |
| one-section | 1440 | h1#hero-title "Loker D3 Farmasidi Kota Bandung." | the screen at scroll 0px (stride 0) shows 361px of section 1 and the heading of section 1 whole and the content of 2 sections, over 24px each beside section 2: a screen shows one section (another may peek 8px, 24px WARN) (SR-4) |
| one-section | 1440 | div#root > footer.site-footer "LokerFarmasi.D3 Farmasi. Kota Bandung.Pe" | the screen at scroll 512px (the top of section 3) shows 93px of section 3 and the content of 2 sections, over 24px each beside section 2: a screen shows one section (another may peek 8px, 24px WARN) (and 1 more like it: scroll 441px) (SR-4) |
| one-section | 1440 | main#top > div.wrap.workspace "Filter lowonganBuka filterResetSumber lo" | a <div> sits directly in <main>: every part of <main> is a <section> (SR-4) |
| container-edges | 1440 | div#root "Lewati ke pencarianLokerFarmasi.Cari low" | a <div> at the top of the page, outside header.nav, main, footer.closing and nav.actionbar (SR-6) |
| container-edges | 1440 | main#top > section.search-hero.hero > div.wrap "Karier kesehatan, lebih dekatKota Bandun" | the hero's .wrap holds 4 children, 0 of them .hero-text: one .hero-text and at most one strip (SR-6) |
| container-edges | 1440 | main#top > div.wrap.workspace "Filter lowonganBuka filterResetSumber lo" | the section needs exactly one in-flow child .wrap (it has 2 in-flow children, 0 .wrap) (SR-6) |
| container-edges | 1440 | div#results > div.empty-state > span.empty-eyebrow "Pencarian tetap berjalan" | 1 text block starts on a left line at x 788, 692px from the container's left: text starts on the container's left, or on one split line (x 626, 732, 838) (SR-6) |
| container-edges | 1440 | div#results > div.notice.source-notice > p "2 sumber belum bisa dibaca otomatis. Has" | 1 text block starts on a left line at x 420, 324px from the container's left: text starts on the container's left, or on one split line (x 626, 732, 838) (SR-6) |
| container-edges | 1440 | div#results > div.results-meta > span "Diperiksa 11 Nov 2026, 13.43 WIB" | 1 text block starts on a left line at x 376, 280px from the container's left: text starts on the container's left, or on one split line (x 626, 732, 838) (and 3 more like it: "Lowongan terbaru", x 154, x 117) (SR-6) |
| container-edges | 1440 | div#results > div.notice.source-notice "2 sumber belum bisa dibaca otomatis. Has" | a box over half the container wide runs 376-1344px, not on the container's lines at 96-1344px (SR-6) |
| container-edges | 1440 | div#results > div.empty-state "Pencarian tetap berjalanBelum ada lowong" | a box over half the container wide runs 376-1344px, not on the container's lines at 96-1344px (and 1 more like it: "Hanya peluang yang masih") (SR-6) |
| hero-fill | 390 | main#top > div.wrap.workspace > aside.filters "Filter lowongan Buka filter Reset" | the next section shows on the first screen: it starts at 709px on a 844px screen (the hero ends at 685px) |
| no-visual | 390 | div#results "Lowongan terbaru" | no picture, effect or mock in this section; a feature section needs a visual |
| edge-left | 1440 | section.search-hero.hero p "Temukan pekerjaan yang sesuai pe" | starts at x 954; the lines are 96 and the column starts |
| edge-left | 1440 | div.wrap.workspace p.section-kicker "Peluang di sekitarmu" | starts at x 376; the lines are 96 and the column starts |
| edge-left | 1440 | div.wrap.workspace h2 "Lowongan terbaru" | starts at x 376; the lines are 96 and the column starts |
| edge-left | 1440, 390 | footer.site-footer span "D3 Farmasi. Kota Bandung." | starts at x 206.3; the lines are 96 and the column starts |
| edge-left | 1440 | footer.site-footer span.footer-auto "Pembaruan otomatis selama aplika" | starts at x 1062.5; the lines are 96 and the column starts |
| screen-short | 1440, 390 | section.search-hero.hero section.search-hero.hero "Karier kesehatan, lebih dekatKot" | 361px tall; one screen under the nav is 900px |
| hero-fold | 1440, 390 | section.search-hero.hero section.search-hero.hero "Karier kesehatan, lebih dekatKot" | starts at y 80, not under the nav |

**Cara menjalankan**

Website yang berjalan: http://127.0.0.1:5173/. Berikutnya gunakan npm run dev; untuk build gunakan npm run build lalu npm start (port 4173). Pembaruan otomatis hanya berjalan selama proses aplikasi lokal aktif. Tidak ada deployment atau layanan cloud.

Rincian batas sumber dan perintah ada di README.md. Laporan mesin: .taste-skill/gate.json dan .taste-skill/gate/consistency/report.json. Kinerja lengkap: .taste-skill/perf.txt.
