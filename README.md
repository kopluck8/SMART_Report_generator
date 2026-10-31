# Generator LPK & RPK SMART Patrol

Aplikasi web statis (tanpa server) yang mengubah file ekspor patroli **SMART Desktop** (XML/zip) menjadi **Laporan Pelaksanaan Kegiatan (LPK)** dengan format Balai Taman Nasional Tambora. Tab **RPK** menyusun **Rencana Pelaksanaan Kegiatan** dari isian form, tanpa file SMART. Semua data diproses di browser; tidak ada yang diunggah ke mana pun.

## Isi laporan

LPK dan RPK mengikuti **Memorandum M.57/T.41/TU/PEG/02/2026** tentang tertib administrasi pelaporan (Lampiran 3 lembar pengesahan, Lampiran 4 format laporan kegiatan keteknisan) dan catatan koreksi LPK ST.1336. Susunan dokumen:

- **Sampul**: jenis dokumen, judul lengkap, logo, "OLEH: TIM PELAKSANA KEGIATAN", nomor ST, periode, tempat dan bulan (tanpa nomor halaman).
- **Lembar pengesahan** (bernomor i): kop, ringkasan (judul, waktu, lokasi, pelaksana per unsur, jumlah dan sumber anggaran, disusun di, tanggal, oleh), lalu tanda tangan. LPK: Menyetujui Kepala Subbagian Tata Usaha dan Tim Pelaksana, Mengetahui Kepala Balai. RPK: Diperiksa dan Disetujui PPK, Koordinator Kegiatan, Mengesahkan Kepala Balai. Nama tidak ditebalkan atau digarisbawahi.
- **Daftar Isi** dan **Daftar Tabel** (ii, iii). Di Word keduanya berupa field yang terisi nomor halaman saat dokumen dibuka (pilih **Yes** ketika Word menanyakan pembaruan field).
- **Isi** (bernomor 1, 2, …): kop, "LAPORAN / TENTANG / judul" (RPK: "RENCANA PELAKSANAAN KEGIATAN / TENTANG / judul"), lalu:
  1. **Pendahuluan**: a. Umum, b. Maksud dan Tujuan, c. Ruang Lingkup, d. Dasar.
  2. **Kegiatan yang dilaksanakan** (RPK: yang akan dilaksanakan): a. Keadaan Umum Lokasi Kegiatan, b. Waktu Pelaksanaan, c. Alat dan Bahan, d. Metode Pelaksanaan/Pengumpulan Data, e. Metode Analisis Data, f. Tim Pelaksana (per unsur, dengan peran masing-masing), g. Rincian Anggaran dan Biaya, h. Tata Waktu/Jadwal Pelaksanaan.
  3. **Hasil yang dicapai** (LPK): a. Hasil per kategori dengan tabel ringkasan, b. Pembahasan.
  4. **Simpulan dan saran** (LPK).
  5. **Penutup** (RPK: 3. Penutup), blok tanda tangan pembuat laporan, dan daftar LAMPIRAN dengan tanda panah.
- **Lampiran** LPK: 1. Surat Tugas, 2. Matriks Data Hasil Kegiatan, 3. Matriks Analisis Data, 4. Peta Kerja/Peta Hasil Kegiatan, 5. Dokumentasi Kegiatan. Lampiran 2 dan 3 dicetak mendatar (lanskap). RPK: 1. Surat Tugas, 2. Peta Kerja.

Format mengikuti contoh Memorandum: Arial 12 pt (tabel, keterangan gambar, dan catatan kaki 11 pt), margin 4-3-3-3 cm, kop dengan logo di kiri, judul bagian bernomor menggantung, paragraf menjorok 1 cm. Nomor tabel memakai field SEQ sehingga Daftar Tabel ikut terisi. Nama ilmiah dicetak miring; label SMART tiga bagian ditulis "Nama lokal/Nama lokal (*Genus species*)" di narasi.

## Mengurangi ketik manual

- **Wilayah kerja**: pilih SPTN Wilayah I Kore, SPTN Wilayah II Pekat, atau salah satu dari tujuh resor (2026). Pilihan "Otomatis" menebak wilayah dari titik patroli (LPK) atau grid rencana (RPK) dengan batas resor 2026. Bagian Umum dan Keadaan Umum Lokasi Kegiatan (luas, desa binaan, kantor, akses, potensi, ancaman) disusun dari profil wilayah yang dipilih.
- **Profil kawasan, SPTN, dan resor** berasal dari Satu Data Tambora (Kajian Wilayah Kerja Resor 2026). Aplikasi mencoba membaca kajian terbaru dari situs Satu Data saat dibuka; bila gagal dipakai salinan di `js/profil.js`.
- **Isian lapangan** (LPK langkah 3): kondisi cuaca, kendala, pelaku dan tindakan terhadap aktivitas manusia, faktor kerawanan, peran mitra/aparat, dugaan tindak pidana, tindak lanjut, dan data kamera jebak diisi dengan pilihan, centang, angka, atau tanggal. Isian yang dikosongkan tidak ditulis di narasi. Pertanyaan yang muncul menyesuaikan judul kegiatan dan temuan.
- **Peran anggota** (Ketua Tim, Navigator, Pencatat Data SMART, Pengamanan, Pemandu Lapangan, dll.) dipilih dari daftar; uraian tugas tiap peran ditulis otomatis.
- **Petugas di luar daftar pegawai** (Polri, TNI, MMP, MPA, masyarakat, atau pegawai baru): ketik nama di kotak pencarian lalu pilih **Isi manual**; pangkat dan jabatan punya daftar usulan.
- Narasi tetap bisa diedit langsung di pratinjau. Panel **Kesiapan data laporan** menandai isian yang belum lengkap; centang "Narasi sudah diperiksa" setelah membaca teks.

Ekspor: **PDF** (Cetak), **Word .docx**, isi template Word sendiri, CSV temuan, KML, GeoJSON.

## Input bersama LPK dan RPK

- **Judul baku kegiatan** (7 pilihan, sama untuk LPK dan RPK): SMART Patrol bersama MMP/MPA/Pokmas/masyarakat; identifikasi gangguan karhutla dan potensi kawasan; pemasangan dan unduh data kamera jebak; bersama TNI/Polri; patroli pencegahan kebakaran bersama masyarakat (reguler dan PNBP PKH); patroli pencegahan/pengendalian bersama TNI/Polri/masyarakat (BB). Latar belakang, maksud, tujuan, ruang lingkup, metode, analisis, pembahasan, saran, dan alat bawaan menyesuaikan judul. Judul yang diketik sendiri dicocokkan dengan kata kunci; mandat patroli juga dicocokkan. Daftar dan teksnya ada di `KEGIATAN` dalam `js/report.js`.
- **Anggaran**: akun dan rincian per MAK (jenis, volume, satuan, harga). LPK memakai rincian terakhir dari RPK sebagai awal, lalu disimpan per patroli.
- **Alat dan bahan**: tabel jenis, jumlah, satuan.
- **Tim**: setiap anggota punya unsur (Balai, Polri, TNI, MMP, MPA, masyarakat) dan peran. Unsur ditebak dari pangkat (Bripka, Serda, dst.) dan bisa diganti. Di LPK, anggota yang ikut tetapi tidak tercatat di SMART bisa ditambahkan.
- **Dasar**: satu daftar di Profil, dipakai LPK dan RPK.
- **Penandatangan**: Kepala Balai dan Kasubbag TU diambil dari daftar pegawai. Di Profil bisa diganti (mis. pejabat Plt./Plh.), termasuk sebutan jabatan TU, alamat, dan kontak di kop.
- **Scan Surat Tugas** JPG/PNG/PDF (pdf.js 3.11.174 dari cdnjs, dimuat hanya saat dibutuhkan).
- Word disimpan sebagai `LPK_<nomor ST>.docx` dan `RPK_<nomor ST>.docx`.

## Data yang disiapkan

| Data | Di mana diisi | Keterangan |
| --- | --- | --- |
| Ekspor patroli SMART (.zip) | Langkah 1 | Patrol → Export, sertakan attachments. Judul kegiatan diambil dari mandat patroli |
| Nomor dan tanggal ST, tanggal pelaksanaan sesuai ST, wilayah kerja, tempat dan tanggal penandatanganan | Langkah 2 | Diisi oleh pembuat laporan, disimpan per ID patroli di browser |
| Isian lapangan (pilihan) | Langkah 3 (LPK) | Disimpan per ID patroli |
| Rincian anggaran, alat dan bahan, scan Surat Tugas | Langkah 4 (LPK) / form RPK | Disimpan di browser; LPK per ID patroli |
| Anggota di luar daftar pegawai | Langkah 2 | Isi nama, NIP/NRP/NIK, pangkat, jabatan, unsur sekali saja |
| DIPA (nomor, tanggal, sumber anggaran) | Bawaan, tetap | `data/dipa.json` per tahun anggaran |
| Daftar pegawai | Bawaan | `data/pegawai.xlsx`, urutan baris = urutan kepangkatan (dipakai untuk urutan tabel tim). Kolom: Nama, NIP (teks 18 digit), Jabatan, Pangkat/Gol. Kepala Balai dan Kasubbag TU dikenali dari kolom Jabatan |
| Profil kawasan dan wilayah kerja | Bawaan | `data/kajian_resor_2026.json` dan `data/batas_resor_2026.geojson` (salinan Satu Data Tambora), ditanam ke `js/profil.js` dengan `python3 tools/build_profil.py` |
| Data Model SMART | Bawaan | Muat ulang di Langkah 6 bila Data Model berubah |
| Logo dan lapisan peta | Bawaan | `img/logo-tntambora.png` dan `data/*.geojson` |

Semua data bawaan lain ditanam ke `js/defaults.js` dengan `python3 tools/build_defaults.py`. Jalankan ulang setelah mengganti daftar pegawai, DIPA tahun baru, logo, atau lapisan peta. Setelah kajian resor di Satu Data diperbarui, salin ulang kedua filenya ke `data/` lalu jalankan `python3 tools/build_profil.py`.

## Pasang di GitHub Pages

1. Buat repository baru, mis. `lpk-smart-tambora`.
2. Unggah seluruh isi folder ini (`index.html`, `css/`, `js/`, `img/`, `data/`, `contoh/`, `tools/`, `.nojekyll`).
3. Settings → Pages → Source: *Deploy from a branch*, Branch: `main` / root → Save.
4. Buka `https://<username>.github.io/lpk-smart-tambora/`.

Daftar pegawai (berisi NIP) dan jalur patroli ikut terunggah bersama kode. Jadikan repository privat bila memungkinkan. Jangan unggah file ekspor patroli dan foto ke repository.

## Template Word sendiri

Tulis placeholder di template `.docx`, lalu pilih **Isi template .docx**. Contoh: `contoh/template-laporan-contoh.docx`.

Teks (boleh di tengah kalimat): `nomor_st, judul, judul_lengkap, lokasi, periode, tanggal_mulai, tanggal_selesai, tanggal_st, jumlah_hari, jarak_km, jumlah_temuan, jumlah_titik, jumlah_anggota, ketua_tim, nip_ketua, daftar_anggota, grid, resor, anggaran, sumber_anggaran, tanggal_laporan, kota, latar, maksud, ruanglingkup, hasil, pembahasan, kesimpulan, saran`

Blok (satu paragraf sendiri): `tabel_anggota, peta, tabel_temuan, foto, tanda_tangan`

Tips Google Docs: ketik placeholder sekaligus tanpa mengubah format di tengahnya.

## Memperbarui kamus Data Model

```
python3 tools/build_dictionary.py datamodel.xml > js/dictionary.js
```

Mengganti logo atau lapisan bawaan: ganti file di `img/` atau `data/`, lalu jalankan `python3 tools/build_defaults.py`.

Label tambahan di luar Data Model (atribut patroli seperti sumber anggaran) ada di `js/dictionary-extra.js`.

## Struktur kode

| File | Isi |
| --- | --- |
| `js/parser.js` | XML patroli SMART 1.x, track WKB, Data Model XML, kamus CSV, UTM |
| `js/defaults.js` | Logo dan lapisan peta bawaan (dibuat oleh `tools/build_defaults.py`) |
| `js/dictionary.js` | Kamus label dari Data Model Balai TN Tambora (dibuat oleh `tools/build_dictionary.py`) |
| `js/report.js` | Model laporan, grid/zonasi dari lapisan, narasi otomatis, kesiapan data, HTML LPK |
| `js/profil.js` | Profil kawasan, SPTN, resor, dan batas resor 2026 (dibuat oleh `tools/build_profil.py`) |
| `js/wilayah.js` | Pilihan wilayah kerja, tebakan wilayah dari titik/grid, narasi Umum dan Keadaan Umum Lokasi |
| `js/map.js` | Peta statis (canvas) dengan lapisan grid/zonasi |
| `js/export.js` | Word .docx, isi template, CSV, KML, GeoJSON |
| `js/app.js` | Antarmuka LPK, profil, penyimpanan browser |
| `js/rpk.js` | Model, narasi, kesiapan data, dan HTML RPK |
| `js/ui.js` | Komponen form bersama: tabel RAB/alat, pilihan unsur dan peran, pencarian pegawai dengan isian manual, isian lapangan, scan Surat Tugas |
| `js/rpk-app.js` | Tab RPK: form, tim, peta grid |

Pustaka dari CDN: JSZip 3.10.1, docx 8.5.0, shpjs 4.0.4, pdf.js 3.11.174 (khusus scan PDF Surat Tugas).
