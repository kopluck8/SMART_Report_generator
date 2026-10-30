# Generator LPK & RPK SMART Patrol

Aplikasi web statis (tanpa server) yang mengubah file ekspor patroli **SMART Desktop** (XML/zip) menjadi **Laporan Pelaksanaan Kegiatan (LPK)** dengan format Balai Taman Nasional Tambora. Tab **RPK** menyusun **Rencana Pelaksanaan Kegiatan** dari isian form, tanpa file SMART. Semua data diproses di browser; tidak ada yang diunggah ke mana pun.

## Isi laporan

LPK dan RPK memakai susunan yang sama (sesuai catatan koreksi LPK ST.1336), tanpa sampul dan tanpa format BAB:

- **Halaman pertama**: kop Balai, judul "LAPORAN / TENTANG / Pelaksanaan Kegiatan …" (RPK: "RENCANA PELAKSANAAN KEGIATAN / TENTANG / …"), ringkasan (judul, nomor ST, waktu, lokasi, pelaksana per unsur, jumlah dan sumber anggaran), lalu tanda tangan (LPK: Kepala Subbagian Tata Usaha, Ketua Tim, Kepala Balai; RPK: PPK, Koordinator, Kepala Balai).
- **A. Pendahuluan**: latar belakang, maksud dan tujuan (tujuan pencegahan karhutla bila ada temuan api), ruang lingkup, dasar (dasar hukum, MoU TNI/Polri bila tim memuat unsur itu, DIPA, Surat Tugas).
- **B. Pelaksanaan Kegiatan** (RPK: Rencana Pelaksanaan): keadaan lokasi; waktu (LPK membedakan waktu kerja sesuai ST dengan sesi perekaman SMART, jarak darat dan drone dipisah); alat dan bahan (tabel jenis dan jumlah); metode pengumpulan dan analisis data; tim pelaksana dikelompokkan per unsur (Balai/NIP, Polri/NRP, TNI/NRP, MMP-MPA-masyarakat/NIK); anggaran (rincian per MAK, total, terbilang) dan tata waktu.
- **C. Hasil dan Pembahasan** (LPK): per kategori dengan foto dan tabel koordinat; membedakan jumlah catatan dan titik koordinat unik, menandai catatan ganda (tidak dihapus), dan menjelaskan "Belum ada di daftar aplikasi".
- **D. Simpulan dan Saran**, **E. Penutup** (RPK: **C. Penutup**).
- **Lampiran**: LPK A peta, B dokumentasi, C keanekaragaman hayati, D scan Surat Tugas; RPK A peta grid rencana, B scan Surat Tugas.

Narasi dibuat otomatis dan bisa diedit. Bagian yang harus dilengkapi manual ditandai `[ … ]` (disorot kuning) dan muncul di panel **Kesiapan data laporan**, bersama cek konsistensi jumlah, catatan ganda, unsur anggota, rincian anggaran, dan scan ST. Nama ilmiah otomatis dicetak miring; ejaan baku (imbauan, pembaruan, penggembalaan, s.d.) dirapikan.

Ekspor: **PDF** (Cetak), **Word .docx**, isi template Word sendiri, CSV temuan, KML, GeoJSON.

## Input bersama LPK dan RPK

- **Judul baku kegiatan** (7 pilihan, sama untuk LPK dan RPK): SMART Patrol bersama MMP/MPA/Pokmas/masyarakat; identifikasi gangguan karhutla dan potensi kawasan; pemasangan dan unduh data kamera jebak; bersama TNI/Polri; patroli pencegahan kebakaran bersama masyarakat (reguler dan PNBP PKH); patroli pencegahan/pengendalian bersama TNI/Polri/masyarakat (BB). Latar belakang, maksud, tujuan, ruang lingkup, metode, analisis, pembahasan, saran, dan alat bawaan menyesuaikan judul. Judul yang diketik sendiri dicocokkan dengan kata kunci; mandat patroli juga dicocokkan. Daftar dan teksnya ada di `KEGIATAN` dalam `js/report.js`.
- **Anggaran**: akun dan rincian per MAK (jenis, volume, satuan, harga). LPK memakai rincian terakhir dari RPK sebagai awal, lalu disimpan per patroli.
- **Alat dan bahan**: tabel jenis, jumlah, satuan.
- **Tim**: setiap anggota punya unsur (Balai, Polri, TNI, MMP, MPA, masyarakat). Unsur ditebak dari pangkat (Bripka, Serda, dst.) dan bisa diganti. Di LPK, anggota yang ikut tetapi tidak tercatat di SMART bisa ditambahkan.
- **Dasar**: satu daftar di Profil, dipakai LPK dan RPK. Profil lama otomatis diperbarui (PP 34/2002 diganti PP 23/2021).
- **Scan Surat Tugas** JPG/PNG/PDF (pdf.js 3.11.174 dari cdnjs, dimuat hanya saat dibutuhkan).
- Word disimpan sebagai `LPK_<nomor ST>.docx` dan `RPK_<nomor ST>.docx`.

## Data yang disiapkan

| Data | Di mana diisi | Keterangan |
| --- | --- | --- |
| Ekspor patroli SMART (.zip) | Langkah 1 | Patrol → Export, sertakan attachments. Judul kegiatan diambil dari mandat patroli |
| Nomor dan tanggal ST, tanggal pelaksanaan sesuai ST, tempat dan tanggal penandatanganan | Langkah 2 | Diisi oleh pembuat laporan, disimpan per ID patroli di browser |
| Rincian anggaran, alat dan bahan, scan Surat Tugas | Langkah 3 (LPK) / form RPK | Disimpan di browser; LPK per ID patroli |
| Anggota di luar daftar pegawai | Langkah 2 | Muncul otomatis; isi nama, NIP/NRP/NIK, pangkat, jabatan, unsur sekali saja |
| DIPA (nomor, tanggal, sumber anggaran) | Bawaan, tetap | `data/dipa.json` per tahun anggaran |
| Daftar pegawai | Bawaan | `data/pegawai.xlsx`, urutan baris = urutan kepangkatan (dipakai untuk urutan tabel tim). Kolom: Nama, NIP (teks 18 digit), Jabatan, Pangkat/Gol. Kepala Balai dan Kasubbag TU dikenali dari kolom Jabatan |
| Data Model SMART | Bawaan | Muat ulang di Langkah 5 bila Data Model berubah |
| Logo dan lapisan peta | Bawaan | `img/logo-tntambora.png` dan `data/*.geojson` |

Semua data bawaan ditanam ke `js/defaults.js` dengan `python3 tools/build_defaults.py`. Jalankan ulang setelah mengganti daftar pegawai, DIPA tahun baru, logo, atau lapisan peta.

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
| `js/map.js` | Peta statis (canvas) dengan lapisan grid/zonasi |
| `js/export.js` | Word .docx, isi template, CSV, KML, GeoJSON |
| `js/app.js` | Antarmuka LPK, profil, penyimpanan browser |
| `js/rpk.js` | Model, narasi, kesiapan data, dan HTML RPK |
| `js/ui.js` | Komponen form bersama: tabel RAB/alat, pilihan unsur, pencarian pegawai, scan Surat Tugas |
| `js/rpk-app.js` | Tab RPK: form, tim, peta grid |

Pustaka dari CDN: JSZip 3.10.1, docx 8.5.0, shpjs 4.0.4, pdf.js 3.11.174 (khusus scan PDF Surat Tugas).
