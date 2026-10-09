# Generator LPK SMART Patrol

Aplikasi web statis (tanpa server) yang mengubah file ekspor patroli **SMART Desktop** (XML/zip) menjadi **Laporan Pelaksanaan Kegiatan (LPK)** dengan format Balai Taman Nasional Tambora. Semua data diproses di browser; tidak ada yang diunggah ke mana pun.

## Isi laporan

Mengikuti LPK resmi (contoh: ST.380 SPTN II Pekat):

- Sampul, Lembar Pengesahan (Kasubbag TU, Tim Kegiatan, Kepala Balai), Daftar Isi.
- **Bab I Pendahuluan**: latar belakang, maksud dan tujuan, ruang lingkup.
- **Bab II Pelaksanaan**: dasar hukum (ditambah DIPA dan ST otomatis), waktu dan tempat (tabel harian, jarak dari track GPS), metode, tim pelaksana, tata waktu (gantt).
- **Bab III Hasil dan Pembahasan**: per kategori (aktivitas manusia, satwa liar, tumbuhan, spesies invasif, ground check, fitur) dengan foto bernomor dan tabel koordinat, grid, zona.
- **Bab IV Penutup**: kesimpulan, saran, tanda tangan.
- **Lampiran**: A peta per kategori + peta tracking dengan tata letak informasi peta (bingkai berkoordinat, logo, judul, skala angka dan batang, arah utara, proyeksi, keterangan, sumber data, peta situasi, instansi dan tahun; tanpa kolom tanda tangan) berisi batas kawasan, zonasi (simbologi resmi), resor, jalur, dan grid berlabel Grid ID, B dokumentasi kegiatan, C dokumentasi keanekaragaman hayati. Semua foto diambil dari data patroli.

Semua narasi dibuat otomatis dan bisa diedit langsung di halaman. Panel **Kesiapan data laporan** menunjukkan data apa yang masih kurang sebelum laporan dicetak.

Ekspor: **PDF** (Cetak), **Word .docx**, isi template Word sendiri, CSV temuan, KML, GeoJSON.

## Data yang disiapkan

| Data | Di mana diisi | Keterangan |
| --- | --- | --- |
| Ekspor patroli SMART (.zip) | Langkah 1 | Patrol → Export, sertakan attachments. Judul kegiatan diambil dari mandat patroli |
| Nomor dan tanggal ST, tanggal pelaksanaan sesuai ST, jumlah anggaran, tempat dan tanggal penandatanganan | Langkah 2 | Diisi oleh pembuat laporan, disimpan per ID patroli di browser |
| Anggota di luar daftar pegawai | Langkah 2 | Muncul otomatis; isi nama, NIP/NIK, pangkat, jabatan sekali saja |
| DIPA (nomor, tanggal, sumber anggaran) | Bawaan, tetap | `data/dipa.json` per tahun anggaran |
| Daftar pegawai | Bawaan | `data/pegawai.xlsx`, urutan baris = urutan kepangkatan (dipakai untuk urutan tabel tim). Kolom: Nama, NIP (teks 18 digit), Jabatan, Pangkat/Gol. Kepala Balai dan Kasubbag TU dikenali dari kolom Jabatan |
| Logo dan lapisan peta | Bawaan | `img/logo-tntambora.png` dan `data/*.geojson` |

Semua data bawaan ditanam ke `js/defaults.js` dengan `python3 tools/build_defaults.py`. Jalankan ulang setelah mengganti daftar pegawai, DIPA tahun baru, logo, atau lapisan peta.
| Data Model SMART | Bawaan | Muat ulang di Langkah 4 bila Data Model berubah |

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
| `js/app.js` | Antarmuka, profil, penyimpanan browser |

Pustaka dari CDN: JSZip 3.10.1, docx 8.5.0, shpjs 4.0.4.
