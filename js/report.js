/*
 * Model laporan dan HTML Laporan Pelaksanaan Kegiatan (LPK) Balai Taman Nasional Tambora.
 * Susunan mengikuti tata naskah laporan: kop, LAPORAN / TENTANG / judul dan pengesahan, lalu
 * A. Pendahuluan, B. Pelaksanaan Kegiatan, C. Hasil dan Pembahasan, D. Simpulan dan Saran, E. Penutup, lampiran.
 * Bagian bersama dengan RPK (tim per unsur, alat, anggaran, tata waktu, dasar hukum) juga ada di sini.
 */
(function () {
  "use strict";

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

  const parseISO = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const toISO = (dt) => dt.toISOString().substr(0, 10);
  const addDays = (iso, n) => { const d = parseISO(iso); d.setUTCDate(d.getUTCDate() + n); return toISO(d); };
  function tglPanjang(iso, withDay) {
    if (!iso) return "";
    const dt = parseISO(iso);
    return (withDay ? HARI[dt.getUTCDay()] + ", " : "") + `${dt.getUTCDate()} ${BULAN[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
  }
  function periode(a, b) {
    if (!b || a === b) return tglPanjang(a);
    const [y1, m1, d1] = a.split("-").map(Number), [y2, m2, d2] = b.split("-").map(Number);
    if (y1 === y2 && m1 === m2) return `${d1}–${d2} ${BULAN[m1 - 1]} ${y1}`;
    if (y1 === y2) return `${d1} ${BULAN[m1 - 1]} – ${d2} ${BULAN[m2 - 1]} ${y1}`;
    return `${tglPanjang(a)} – ${tglPanjang(b)}`;
  }
  // "20 April s.d. 24 April 2026"
  function periodeSd(a, b) {
    const A = parseISO(a), B = parseISO(b || a);
    const left = `${A.getUTCDate()} ${BULAN[A.getUTCMonth()]}` + (A.getUTCFullYear() !== B.getUTCFullYear() ? " " + A.getUTCFullYear() : "");
    return !b || a === b ? tglPanjang(a) : `${left} s.d. ${tglPanjang(b)}`;
  }
  const terbilang = (n) => (n < 12 ? SATUAN[n] : n < 20 ? SATUAN[n - 10] + " belas" : n < 100 ? SATUAN[Math.floor(n / 10)] + " puluh" + (n % 10 ? " " + SATUAN[n % 10] : "") : String(n));
  const nTxt = (n) => `${n} (${terbilang(n) || "nol"})`;
  const num = (v, d = 0) => Number(v).toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtNum = (v) => (Number.isInteger(v) ? num(v) : num(v, 2).replace(/,?0+$/, ""));
  const numVal = (v) => Number(String(v ?? "").replace(/[^\d,]/g, "").replace(",", ".")) || 0;
  const rp = (n) => Math.round(n || 0).toLocaleString("id-ID");
  // Penulisan rupiah sesuai PUEBI: Rp15.550.000,00
  const rupiah = (v) => { const n = typeof v === "number" ? v : numVal(v); return n ? `Rp${rp(n)},00` : ""; };
  // NIP 18 digit -> "19980426 202506 2 013"; spasi tidak terputus supaya tidak terpenggal di tabel
  const fmtNip = (nip) => { const d = String(nip || "").replace(/\D/g, ""); return d.length === 18 ? `${d.substr(0, 8)} ${d.substr(8, 6)} ${d.substr(14, 1)} ${d.substr(15)}` : String(nip || ""); };
  const nb = (s) => String(s).replace(/ /g, " ");
  const toMin = (t) => { const [h, m, s] = (t || "0:0:0").split(":").map(Number); return h * 60 + m + (s || 0) / 60; };
  const hhmm = (min) => `${Math.floor(min / 60)} jam ${String(Math.round(min % 60)).padStart(2, "0")} menit`;
  // Waktu track SMART disimpan sebagai jam lokal perangkat, jadi dibaca apa adanya.
  const clock = (ms) => new Date(ms).toISOString().substr(11, 5);
  const lines = (t) => String(t || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const listText = (arr) => arr.join(", ").replace(/, ([^,]+)$/, " dan $1");
  const PH = (t) => `[${t}]`; // isian yang wajib dilengkapi penyusun

  // Ejaan baku untuk label dari Data Model dan teks bawaan
  function fixText(s) {
    return String(s || "")
      .replace(/\bpengembalaan\b/g, "penggembalaan").replace(/\bPengembalaan\b/g, "Penggembalaan")
      .replace(/\bhimbauan\b/g, "imbauan").replace(/\bHimbauan\b/g, "Imbauan")
      .replace(/\bpembaharuan\b/g, "pembaruan").replace(/\bPembaharuan\b/g, "Pembaruan")
      .replace(/\bhhbk\b/g, "HHBK")
      .replace(/^belum ada di list$/i, "Belum ada di daftar aplikasi");
  }
  const isUnidentified = (key, label) => /belumada(di)?list/i.test(String(key || "").replace(/[^a-z]/gi, "")) || /^belum ada di (list|daftar)/i.test(label || "");
  // Nama ilmiah dicetak miring: "Kesambi - Schleichera oleosa" atau "Abavorana luctuosa"
  const LATIN_END = /(us|um|a|is|ii|i|ae|ensis|ata|ica|ina|osa|ides|ana|ella|eus|ia|es|ax|ix|ex|on|or|ens)$/;
  function sci(name) {
    const s = String(name || "");
    const m = s.match(/^(.*?)\s+-\s+-?\s*(.+)$/);
    const ital = (t) => esc(t).replace(/[^\s\/]+/g, (w) => (/^spp?\.?$/.test(w) ? w : `<i>${w}</i>`));
    if (m) return `${esc(m[1])} - ${ital(m[2])}`;
    const w = s.split(" ");
    if (w.length === 2 && /^[A-Z][a-z]{2,}$/.test(w[0]) && /^[a-z]{3,}$/.test(w[1]) && LATIN_END.test(w[1]) && !/^(lainnya|lain|biasa)$/.test(w[1])) return `<i>${esc(s)}</i>`;
    return esc(s);
  }

  // Urutan dan warna kategori utama sesuai urutan hasil di LPK.
  const TOP_ORDER = ["aktivitasmanusia", "satwaliar", "tumbuhan", "spesiesinvasif", "groundcheck", "fitur"];
  const TOP_COLORS = { satwaliar: "#e8590c", tumbuhan: "#2f9e44", spesiesinvasif: "#9c36b5", aktivitasmanusia: "#e03131", fitur: "#1971c2", groundcheck: "#a0702a" };
  const SPARE = ["#0c8599", "#f08c00", "#5c940d", "#c2255c", "#495057", "#3b5bdb"];
  const DAY_COLORS = ["#1c7ed6", "#f76707", "#2b8a3e", "#ae3ec9", "#e64980", "#0b7285", "#5f3dc4", "#d9480f"];
  const BIODIV = ["satwaliar", "tumbuhan", "spesiesinvasif"];
  const isFire = (s) => /kebakaran|karhut|\bapi\b|titikapi|apiaktif|bekasterbakar/i.test(s || "");
  const isDrone = (s) => /drone|uav|pesawat/i.test(s || "");

  /* ---------- Bagian bersama LPK dan RPK ---------- */
  const DEFAULT_DASAR = [
    "Undang-Undang Nomor 5 Tahun 1990 tentang Konservasi Sumber Daya Alam Hayati dan Ekosistemnya sebagaimana telah diubah dengan Undang-Undang Nomor 32 Tahun 2024 tentang Perubahan atas Undang-Undang Nomor 5 Tahun 1990 tentang Konservasi Sumber Daya Alam Hayati dan Ekosistemnya;",
    "Undang-Undang Nomor 41 Tahun 1999 tentang Kehutanan sebagaimana telah diubah dengan Undang-Undang Nomor 19 Tahun 2004 tentang Penetapan Peraturan Pemerintah Pengganti Undang-Undang Nomor 1 Tahun 2004 tentang Perubahan atas Undang-Undang Nomor 41 Tahun 1999 tentang Kehutanan menjadi Undang-Undang;",
    "Undang-Undang Nomor 18 Tahun 2013 tentang Pencegahan dan Pemberantasan Perusakan Hutan;",
    "Undang-Undang Nomor 6 Tahun 2023 tentang Penetapan Peraturan Pemerintah Pengganti Undang-Undang Nomor 2 Tahun 2022 tentang Cipta Kerja menjadi Undang-Undang;",
    "Peraturan Pemerintah Nomor 45 Tahun 2004 tentang Perlindungan Hutan sebagaimana telah diubah dengan Peraturan Pemerintah Nomor 60 Tahun 2009;",
    "Peraturan Pemerintah Nomor 28 Tahun 2011 tentang Pengelolaan Kawasan Suaka Alam dan Kawasan Pelestarian Alam sebagaimana telah diubah dengan Peraturan Pemerintah Nomor 108 Tahun 2015;",
    "Peraturan Pemerintah Nomor 23 Tahun 2021 tentang Penyelenggaraan Kehutanan;",
    "Peraturan Menteri Kehutanan Nomor 1 Tahun 2024 tentang Organisasi dan Tata Kerja Kementerian Kehutanan;",
    "Peraturan Menteri Kehutanan Nomor 4 Tahun 2025 tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis Direktorat Jenderal Konservasi Sumber Daya Alam dan Ekosistem;",
    "Surat Edaran Direktur Jenderal Konservasi Sumber Daya Alam dan Ekosistem Nomor SE.6/KSDAE/PKK/KSA.1/12/2022 tentang Pedoman Pelaksanaan dan Pelaporan Hasil Kegiatan Patroli di Kawasan Konservasi;",
    "Keputusan Direktur Jenderal Konservasi Sumber Daya Alam dan Ekosistem Nomor 74 Tahun 2025 tentang Panduan Patroli Berbasis Spatial Monitoring and Reporting Tool (SMART);"
  ].join("\n");
  // Ditambahkan otomatis hanya bila tim melibatkan unsur TNI/Polri
  const PERMEN_KARHUTLA = "Peraturan Menteri Lingkungan Hidup dan Kehutanan Nomor P.32/MENLHK/SETJEN/KUM.1/3/2016 tentang Pengendalian Kebakaran Hutan dan Lahan;";
  const MOU_TNI = "Nota Kesepahaman antara Kementerian Kehutanan dan Tentara Nasional Indonesia tentang Sinergitas Tugas dan Fungsi Kementerian Kehutanan dan Tentara Nasional Indonesia Nomor PKS.4/MENHUT/SETJEN/KUM.3/2/2025 dan Nomor NK/3/II/2025/TNI tanggal 12 Februari 2025;";
  const MOU_POLRI = "Nota Kesepahaman antara Kementerian Kehutanan dan Kepolisian Negara Republik Indonesia tentang Sinergitas Tugas dan Fungsi di Bidang Pembangunan Kehutanan Nomor PKS.6/MENHUT/SETJEN/KUM.3/2/2025 dan Nomor NK/7/II/2025 tanggal 17 Februari 2025;";
  const DEFAULT_METODE = [
    "Bergerak dari satu tempat ke tempat lain dengan berjalan kaki dan/atau menggunakan kendaraan sesuai dengan target (rencana patroli) yang ditentukan.",
    "Pembaruan informasi dan status tim di lapangan disampaikan oleh Ketua Tim Patroli kepada pimpinan secara berjenjang pada setiap kesempatan, minimal 3 hari sekali.",
    "Jalur dan temuan patroli direkam dalam GPS menggunakan format derajat desimal (Decimal Degree/DD).",
    "Setiap temuan di lapangan yang terkait dengan aktivitas ilegal, tumbuhan, satwa liar, potensi wisata alam, pal batas kawasan, gejala alam, dan lainnya direkam menggunakan aplikasi SMART Mobile pada telepon pintar atau secara manual menggunakan GPS, kamera, dan buku format pengambilan data apabila terdapat kendala pada alat perekaman.",
    "Melakukan observasi menyeluruh dengan radius minimal 20 meter di sekitar temuan aktivitas ilegal atau lokasi yang diduga terdapat aktivitas ilegal, atau sesuai kebutuhan.",
    "Tim merekam data secara konsisten, membuat titik jalur, dan melakukan observasi menyeluruh apabila tidak ada temuan penting dalam jarak 50 meter atau sesuai kondisi patroli.",
    "Tim dapat mengumpulkan data potensi dan gangguan kawasan serta data lain yang dibutuhkan, baik di dalam hutan maupun di sekitar batas luar kawasan, sesuai data model yang ditentukan dalam panduan."
  ].join("\n");
  const DEFAULT_ALAT = [
    { nama: "Telepon pintar dengan aplikasi SMART Mobile", jumlah: "", sat: "unit" },
    { nama: "GPS genggam", jumlah: "", sat: "unit" },
    { nama: "Peta kerja kawasan dan peta grid patroli", jumlah: "", sat: "lembar" },
    { nama: "Alat komunikasi (HT/telepon satelit)", jumlah: "", sat: "unit" },
    { nama: "Kamera", jumlah: "", sat: "unit" },
    { nama: "Alat tulis kantor dan buku format pengambilan data", jumlah: "", sat: "paket" },
    { nama: "Perlengkapan P3K", jumlah: "", sat: "paket" },
    { nama: "Karung sampah (trash bag)", jumlah: "", sat: "buah" }
  ];
  const DEFAULT_RAB = [
    { mak: "521211", jenis: "Belanja Bahan Pendukung Kegiatan", vol: "1", sat: "Keg", harga: "660000" },
    { mak: "521219", jenis: "Biaya Operasional Petugas", vol: "25", sat: "OH", harga: "360000" },
    { mak: "521219", jenis: "Biaya Operasional Tenaga Pengaman Lainnya (TNI/POLRI)", vol: "30", sat: "OH", harga: "360000" },
    { mak: "521219", jenis: "Uang Makan MPA/ Masyarakat", vol: "25", sat: "OH", harga: "35000" },
    { mak: "521219", jenis: "Uang Harian MPA/ Masyarakat", vol: "25", sat: "OH", harga: "125000" },
    { mak: "521219", jenis: "Bantuan Transportasi Petugas", vol: "25", sat: "Orang", harga: "30000" }
  ];
  const DEFAULT_AKUN = "7273.REA.002.051.A.521219 (PNP)";

  /* ---------- Judul baku kegiatan dan isi khusus per judul ----------
   * Setiap judul membawa konteks latar belakang, maksud, tujuan, ruang lingkup, tambahan metode/analisis,
   * butir pembahasan dan saran (LPK), alat tambahan, dan unsur tim yang diharapkan.
   * Teks netral waktu; "{akan }" menjadi "akan " di RPK dan hilang di LPK. */
  const ALAT_KARHUT = [
    { nama: "Pompa punggung (jet shooter)", jumlah: "", sat: "unit" },
    { nama: "Pemukul api (gepyok)", jumlah: "", sat: "buah" },
    { nama: "Garu tajam/cangkul", jumlah: "", sat: "buah" },
    { nama: "Parang/golok", jumlah: "", sat: "buah" },
    { nama: "Jeriken air", jumlah: "", sat: "buah" }
  ];
  const ALAT_KAMERA = [
    { nama: "Kamera jebak (camera trap)", jumlah: "", sat: "unit" },
    { nama: "Baterai cadangan kamera jebak", jumlah: "", sat: "buah" },
    { nama: "Kartu memori (SD card)", jumlah: "", sat: "buah" },
    { nama: "Tali pengikat, pelindung, dan gembok kamera", jumlah: "", sat: "set" },
    { nama: "Laptop dan pembaca kartu memori", jumlah: "", sat: "unit" }
  ];
  const K_MITRA = {
    konteks: "Pengamanan kawasan tidak dapat dilakukan oleh petugas Balai saja. Masyarakat Mitra Polhut (MMP), Masyarakat Peduli Api (MPA), Kelompok Masyarakat (Pokmas), dan masyarakat di sekitar kawasan mengenal kondisi lapangan dan berperan penting dalam deteksi dini gangguan serta penyampaian informasi kepada masyarakat. Patroli bersama mitra sekaligus menjadi sarana pembinaan dan peningkatan kapasitas mitra dalam perlindungan kawasan.",
    metode: [
      "Sebelum berangkat dilakukan pengarahan (briefing) kepada anggota mitra mengenai jalur, pembagian tugas, keselamatan, dan cara mengenali serta mencatat temuan.",
      "Anggota mitra didampingi petugas Balai dalam mengenali, mendokumentasikan, dan melaporkan temuan; tindakan terhadap dugaan pelanggaran hanya dilakukan oleh petugas yang berwenang."
    ],
    pembahasan: ["Peran unsur masyarakat selama kegiatan: {mitra}. [asal kelompok (MMP/MPA/Pokmas/desa), kontribusi seperti penunjuk jalan, informasi lokal, dan pencatatan, serta peningkatan kemampuan yang terlihat]"],
    saran: ["Melanjutkan pembinaan dan pelatihan MMP/MPA/Pokmas, termasuk penggunaan SMART Mobile, agar mitra dapat menyampaikan informasi gangguan kawasan secara mandiri dan cepat."],
    perlu: ["masyarakat"]
  };
  const K_APARAT = {
    konteks: "Gangguan kawasan seperti perambahan, pembalakan liar, perburuan satwa, dan pembakaran lahan dapat melibatkan pelaku yang terorganisasi dan berpotensi menimbulkan konflik di lapangan. Sinergi dengan TNI dan Polri, sebagaimana Nota Kesepahaman Kementerian Kehutanan dengan TNI dan dengan Polri, memperkuat kehadiran aparat di lapangan, meningkatkan efek pencegahan, dan mendukung penegakan hukum apabila ditemukan dugaan tindak pidana kehutanan.",
    metode: [
      "Sebelum pelaksanaan dilakukan koordinasi dan pengarahan bersama unsur TNI/Polri mengenai sasaran, jalur, pembagian tugas, dan prosedur bertindak di lapangan.",
      "Apabila ditemukan dugaan tindak pidana kehutanan, tim mengamankan lokasi dan barang bukti, mendokumentasikan, dan melaporkan kepada pimpinan untuk ditindaklanjuti sesuai kewenangan; tindakan hukum dilakukan oleh penyidik yang berwenang."
    ],
    pembahasan: [
      "Peran unsur TNI/Polri selama kegiatan: {aparat}. [bentuk kegiatan bersama, koordinasi dengan Koramil/Polsek setempat, dan informasi gangguan dari aparat]",
      "Temuan yang berindikasi tindak pidana kehutanan: [ada/tidak ada; bila ada: jenis, barang bukti, tindakan yang diambil, dan status penanganan]."
    ],
    saran: ["Melanjutkan patroli bersama TNI/Polri pada lokasi dengan gangguan berulang serta memperkuat pertukaran informasi dengan Koramil dan Polsek setempat."],
    perlu: ["aparat"]
  };
  const K_CEGAH = {
    konteks: "Pencegahan merupakan upaya paling efektif dan efisien dalam pengendalian kebakaran hutan dan lahan (karhutla). Sebagian besar kebakaran berasal dari aktivitas manusia, seperti pembukaan lahan dengan api, perburuan, pengambilan madu dengan pengasapan, penggembalaan, dan api yang ditinggalkan. Patroli pencegahan dilaksanakan pada musim rawan kebakaran untuk memantau lokasi rawan, menyampaikan imbauan larangan membakar, dan melakukan pemadaman awal apabila ditemukan api.",
    maksud: "pencegahan kebakaran hutan dan lahan di kawasan Taman Nasional Tambora melalui patroli, deteksi dini, imbauan, dan pemadaman awal",
    tujuan: [
      "Memantau lokasi rawan kebakaran dan mendeteksi secara dini titik api aktif;",
      "Menyampaikan sosialisasi dan imbauan larangan membakar kepada masyarakat di dalam dan sekitar kawasan;",
      "Melakukan pemadaman awal terhadap api yang ditemukan dan melaporkannya untuk ditindaklanjuti;",
      "Mendata lokasi bekas terbakar, perkiraan luas, dan dugaan sumber api;",
      "Meningkatkan kesiapsiagaan dan peran serta masyarakat dalam pencegahan karhutla."
    ],
    ruang: [
      "Patroli pada lokasi rawan kebakaran berdasarkan riwayat kebakaran, informasi titik panas (hotspot), dan laporan masyarakat;",
      "Sosialisasi dan imbauan pencegahan kebakaran kepada masyarakat yang dijumpai;",
      "Pemadaman awal dan pemeriksaan ulang lokasi api;",
      "Pencatatan data lapangan menggunakan aplikasi SMART Mobile, termasuk titik koordinat dan dokumentasi temuan."
    ],
    metode: [
      "Patroli diarahkan pada lokasi rawan kebakaran berdasarkan riwayat kebakaran, informasi titik panas (hotspot), dan laporan masyarakat.",
      "Tim membawa peralatan pemadaman awal; api aktif yang ditemukan dipadamkan sesuai kemampuan dan peralatan, dilaporkan kepada pimpinan, dan diperiksa kembali sampai dipastikan padam.",
      "Pada lokasi bekas terbakar dicatat perkiraan waktu kejadian, jenis vegetasi terbakar, dan dugaan sumber api; batas area diukur dengan tracking keliling GPS bila memungkinkan.",
      "Imbauan larangan membakar disampaikan secara langsung kepada masyarakat yang dijumpai di dalam dan sekitar kawasan."
    ],
    analisis: "Luas area bekas terbakar {akan }dihitung dari poligon tracking keliling GPS atau digitasi, dan dibedakan dari jumlah objek terbakar yang tercatat di SMART.",
    pembahasan: [
      "Hasil sosialisasi dan imbauan pencegahan kebakaran: [lokasi dan jumlah masyarakat yang diberi imbauan, materi yang disampaikan, dan tanggapan masyarakat].",
      "Pemantauan titik panas (hotspot) selama kegiatan: [ada/tidak ada; bila ada: tanggal, lokasi, dan hasil pengecekan lapangan]."
    ],
    saran: ["Meningkatkan frekuensi patroli pencegahan pada puncak musim kemarau [bulan] di lokasi rawan, serta memastikan kesiapan peralatan pemadaman awal di pos dan kelompok MPA."],
    alat: ALAT_KARHUT, fire: true
  };
  const join = (...ks) => ks.reduce((a, k) => ({ ...a, ...k,
    konteks: [a.konteks, k.konteks].filter(Boolean).join(" "),
    metode: [...(a.metode || []), ...(k.metode || [])], pembahasan: [...(a.pembahasan || []), ...(k.pembahasan || [])],
    saran: [...(a.saran || []), ...(k.saran || [])], perlu: [...(a.perlu || []), ...(k.perlu || [])], alat: [...(a.alat || []), ...(k.alat || [])],
    fire: a.fire || k.fire }), {});
  const KEGIATAN = [
    { id: "mitra", judul: "SMART Patrol Bersama MMP/MPA/Pokmas/Masyarakat di Kawasan TN Tambora", ...join(K_MITRA, {
      maksud: "pengamanan kawasan Taman Nasional Tambora secara partisipatif bersama masyarakat mitra serta peningkatan peran serta masyarakat dalam perlindungan kawasan",
      tujuan: [
        "Mendeteksi dan mendokumentasikan gangguan kawasan secara dini bersama masyarakat mitra;",
        "Meningkatkan pengetahuan dan keterampilan anggota MMP/MPA/Pokmas dalam pengamanan kawasan dan pencatatan data SMART;",
        "Menyampaikan imbauan dan sosialisasi peraturan kawasan kepada masyarakat yang dijumpai;",
        "Mengumpulkan data potensi kawasan berupa satwa liar, tumbuhan, sumber air, dan sarana prasarana;",
        "Membangun komunikasi dan jejaring informasi gangguan kawasan antara Balai dan masyarakat."
      ],
      ruang: [
        "Patroli bersama masyarakat mitra pada jalur dan grid sasaran;",
        "Pendampingan anggota mitra dalam mengenali, mendokumentasikan, dan melaporkan temuan;",
        "Imbauan dan sosialisasi kepada masyarakat yang dijumpai di dalam dan sekitar kawasan;",
        "Pencatatan data lapangan menggunakan aplikasi SMART Mobile, termasuk titik koordinat dan dokumentasi temuan."
      ]
    }) },
    { id: "identifikasi", judul: "SMART Patrol dalam Rangka Identifikasi Gangguan Karhutla dan Potensi Kawasan", fire: true, alat: ALAT_KARHUT,
      konteks: "Kebakaran hutan dan lahan (karhutla) merupakan salah satu gangguan utama di kawasan Taman Nasional Tambora, terutama pada musim kemarau di ekosistem savana dan hutan musim yang mudah terbakar. Identifikasi lokasi rawan, bekas terbakar, dan aktivitas manusia yang berpotensi menjadi sumber api perlu dilakukan bersamaan dengan pendataan potensi kawasan, sehingga upaya pencegahan dapat diarahkan pada lokasi yang tepat dengan tetap memperhatikan nilai penting kawasan yang harus dilindungi.",
      maksud: "identifikasi gangguan kebakaran hutan dan lahan serta pendataan potensi kawasan Taman Nasional Tambora sebagai dasar perencanaan pencegahan karhutla dan pengelolaan kawasan",
      tujuan: [
        "Mengidentifikasi titik api aktif, lokasi bekas terbakar, dan lokasi rawan kebakaran;",
        "Mengidentifikasi aktivitas manusia yang berpotensi menjadi sumber api, seperti pembukaan lahan, penggembalaan, pengambilan madu, dan perburuan;",
        "Mengukur dan mendokumentasikan luas serta kondisi area bekas terbakar;",
        "Mendata potensi kawasan berupa satwa liar, tumbuhan, sumber air, dan tutupan lahan;",
        "Menyediakan data spasial sebagai dasar penetapan lokasi prioritas pencegahan karhutla."
      ],
      ruang: [
        "Penyisiran lokasi rawan kebakaran dan lokasi bekas terbakar;",
        "Pengukuran luas dan dokumentasi area bekas terbakar serta pencatatan dugaan sumber api;",
        "Pendataan potensi kawasan: satwa liar, tumbuhan, sumber air, dan tutupan lahan;",
        "Imbauan kepada masyarakat yang ditemukan beraktivitas di dalam kawasan;",
        "Pencatatan data lapangan menggunakan aplikasi SMART Mobile, termasuk titik koordinat dan dokumentasi temuan."
      ],
      metode: [
        "Pada lokasi bekas terbakar, batas area diukur dengan tracking keliling GPS bila memungkinkan, serta dicatat perkiraan waktu kejadian, jenis vegetasi terbakar, dan dugaan sumber api.",
        "Pada api aktif, tim melakukan pemadaman awal sesuai kemampuan dan peralatan, melaporkan kepada pimpinan, dan memastikan kondisi api sebelum meninggalkan lokasi."
      ],
      analisis: "Lokasi rawan kebakaran {akan }ditentukan dari sebaran bekas terbakar, titik api, dan aktivitas manusia berisiko per grid, lalu ditumpangsusunkan dengan sebaran potensi kawasan.",
      pembahasan: [
        "Lokasi rawan kebakaran yang teridentifikasi: [lokasi/grid, tipe vegetasi, dan faktor kerawanan seperti bahan bakar, akses, dan aktivitas manusia].",
        "Potensi kawasan yang tercatat [ringkas nilai penting: satwa/tumbuhan dilindungi, sumber air] perlu dipertimbangkan dalam penentuan lokasi prioritas pencegahan karhutla."
      ],
      saran: ["Menetapkan lokasi rawan dan bekas terbakar hasil kegiatan ini sebagai sasaran patroli pencegahan karhutla pada musim kemarau berikutnya."]
    },
    { id: "kamera", judul: "SMART Patrol dalam Rangka Pemasangan dan Unduh Data Kamera Jebak untuk Pemantauan Satwa dan Deteksi Dini Kebakaran", alat: ALAT_KAMERA,
      konteks: "Kamera jebak (camera trap) bekerja terus-menerus tanpa kehadiran petugas, sehingga dapat merekam keberadaan dan aktivitas satwa liar, aktivitas manusia, serta kejadian kebakaran di lokasi yang sulit dijangkau secara rutin. Pemasangan, perawatan, dan pengunduhan data kamera jebak yang dipadukan dengan SMART Patrol memungkinkan data kamera dan data patroli dianalisis dalam satu sistem.",
      maksud: "pemantauan satwa liar dan deteksi dini kebakaran hutan dan lahan melalui pemasangan, perawatan, dan pengunduhan data kamera jebak",
      tujuan: [
        "Memasang atau memindahkan kamera jebak pada titik pemantauan yang ditentukan;",
        "Mengunduh data serta merawat kamera jebak (baterai, kartu memori, dan posisi kamera);",
        "Mengidentifikasi jenis satwa liar yang terekam dan menghitung kejadian independen per jenis;",
        "Mendeteksi aktivitas manusia dan indikasi kebakaran yang terekam kamera jebak;",
        "Mencatat temuan di sepanjang jalur menuju titik kamera menggunakan SMART."
      ],
      ruang: [
        "Pemasangan, pengecekan, dan pengunduhan data kamera jebak pada titik pemantauan;",
        "Identifikasi rekaman satwa liar, aktivitas manusia, dan indikasi kebakaran;",
        "Pencatatan temuan di sepanjang jalur menggunakan aplikasi SMART Mobile, termasuk titik koordinat dan dokumentasi temuan."
      ],
      metode: [
        "Setiap titik kamera jebak dicatat kode kamera, koordinat, tanggal dan jam pemasangan atau pengecekan, ketinggian dan arah kamera, kondisi baterai dan kartu memori, serta foto kondisi pemasangan.",
        "Data kamera diunduh ke media penyimpanan, diberi nama sesuai kode kamera dan tanggal, lalu diidentifikasi per kejadian independen dengan selang minimal 30 menit antar-rekaman jenis yang sama pada kamera yang sama."
      ],
      analisis: "Rekaman kamera jebak {akan }dianalisis per titik: jumlah hari aktif kamera (trap-days), jumlah foto/video, jumlah kejadian independen per jenis, dan indeks kelimpahan relatif (RAI = kejadian independen ÷ hari aktif × 100).",
      pembahasan: [
        "Rekap kamera jebak: [per kamera: kode, koordinat/grid, tanggal pasang, tanggal unduh, hari aktif, jumlah foto/video, jenis satwa terekam, dan kondisi kamera].",
        "Rekaman aktivitas manusia atau indikasi kebakaran dari kamera jebak: [ada/tidak ada; uraian]."
      ],
      saran: ["Menjadwalkan pengunduhan data dan penggantian baterai berikutnya pada [tanggal], serta mengevaluasi titik kamera yang tidak merekam satwa."]
    },
    { id: "aparat", judul: "SMART Patrol Bersama TNI/POLRI", ...join(K_APARAT, {
      maksud: "pengamanan kawasan Taman Nasional Tambora secara terpadu bersama TNI/Polri untuk mencegah dan menanggulangi gangguan kawasan",
      tujuan: [
        "Menghadirkan aparat gabungan di lokasi rawan gangguan untuk mencegah tindak pidana kehutanan;",
        "Mendeteksi dan mendokumentasikan gangguan kawasan secara dini;",
        "Mengamankan lokasi dan barang bukti serta mengumpulkan bahan keterangan awal apabila ditemukan dugaan tindak pidana;",
        "Menyampaikan imbauan dan penyuluhan hukum kepada masyarakat yang dijumpai;",
        "Memperkuat koordinasi dan pertukaran informasi antara Balai, TNI, dan Polri."
      ],
      ruang: [
        "Patroli gabungan bersama TNI/Polri pada lokasi rawan gangguan;",
        "Pengecekan informasi gangguan kawasan dan pengamanan lokasi temuan;",
        "Imbauan dan penyuluhan hukum kepada masyarakat;",
        "Pencatatan data lapangan menggunakan aplikasi SMART Mobile, termasuk titik koordinat dan dokumentasi temuan."
      ]
    }) },
    { id: "cegah", judul: "Patroli Pencegahan Kebakaran Hutan Bersama MMP/MPA/Pokmas/Masyarakat", ...join(K_CEGAH, K_MITRA) },
    { id: "cegah_pnbp", judul: "Patroli Pencegahan Kebakaran Hutan Bersama MMP/MPA/Pokmas/Masyarakat (PNBP PKH)", ...join(K_CEGAH, K_MITRA, { konteks: "Kegiatan ini dibiayai dari Penerimaan Negara Bukan Pajak Penggunaan Kawasan Hutan (PNBP PKH)." }) },
    { id: "cegah_aparat", judul: "Patroli Pencegahan/Pengendalian Kebakaran Hutan Bersama TNI/POLRI/Masyarakat (BB)", ...join(K_CEGAH, K_APARAT, K_MITRA, {
      maksud: "pencegahan dan pengendalian kebakaran hutan dan lahan di kawasan Taman Nasional Tambora secara terpadu bersama TNI/Polri dan masyarakat",
      tujuan: [...K_CEGAH.tujuan.slice(0, 4), "Memperkuat sinergi Balai, TNI/Polri, dan masyarakat dalam pencegahan dan penanganan karhutla serta penegakan larangan membakar."]
    }) }
  ];
  // Cocokkan judul (atau mandat patroli) ke judul baku
  function kegiatanOf(judul) {
    const s = String(judul || "").toLowerCase();
    if (!s) return null;
    const exact = KEGIATAN.find((k) => k.judul.toLowerCase() === s.trim());
    if (exact) return exact;
    const fire = /kebakaran|karhut/.test(s), aparat = /\btni\b|polri/.test(s), pnbp = /pnbp|\bpkh\b/.test(s);
    const id = /kamera|camera/.test(s) ? "kamera"
      : /^patroli/.test(s) && /pencegahan|pengendalian/.test(s) && fire ? (aparat ? "cegah_aparat" : pnbp ? "cegah_pnbp" : "cegah")
      : fire ? "identifikasi" : aparat ? "aparat" : /mmp|mpa|pokmas|masyarakat/.test(s) ? "mitra" : null;
    return KEGIATAN.find((k) => k.id === id) || null;
  }
  const alatFor = (k) => [...DEFAULT_ALAT, ...((k && k.alat) || [])].map((r) => ({ ...r }));
  // Teks khusus judul: {akan } sesuai LPK/RPK, {mitra}/{aparat} diganti ringkasan anggota tim
  function kegText(s, rpk, members) {
    const n = (keys) => (members || []).filter((m) => keys.includes(m.unsur)).length;
    const mas = n(["mmp", "mpa", "masyarakat"]), apa = n(["tni", "polri"]);
    return String(s || "").replace(/\{akan \}/g, rpk ? "akan " : "")
      .replace(/\{mitra\}/g, mas ? `${nTxt(mas)} orang unsur masyarakat (MMP/MPA/Pokmas/masyarakat) ikut dalam tim` : "[jumlah anggota unsur masyarakat]")
      .replace(/\{aparat\}/g, apa ? `${nTxt(apa)} orang unsur TNI/Polri ikut dalam tim` : "[jumlah anggota TNI/Polri]");
  }
  // Metode umum (Profil) ditambah langkah khusus judul yang belum ada
  const metodeLines = (text, k) => {
    const base = lines(text || DEFAULT_METODE).map((x) => x.replace(/^\d+[.)]\s*/, ""));
    return [...base, ...((k && k.metode) || []).filter((x) => !base.includes(x))];
  };
  // Cek unsur tim yang diharapkan judul
  function kegTeamCheck(k, members) {
    if (!k || !k.perlu || !k.perlu.length) return null;
    const has = (keys) => members.some((m) => keys.includes(m.unsur));
    const kurang = [...new Set(k.perlu)].filter((p) => !(p === "aparat" ? has(["tni", "polri"]) : has(["mmp", "mpa", "masyarakat"])));
    return { label: "Unsur tim sesuai judul kegiatan", ok: !kurang.length, note: kurang.length ? `judul menyebut ${kurang.map((p) => (p === "aparat" ? "TNI/Polri" : "MMP/MPA/Pokmas/masyarakat")).join(" dan ")}, tetapi belum ada di tim` : "" };
  }

  // Unsur tim pelaksana. Tabel dan narasi dikelompokkan: Balai, Polri, TNI, masyarakat (MMP/MPA/masyarakat)
  const UNSUR = { balai: "Balai Taman Nasional Tambora", polri: "Polri", tni: "TNI", mmp: "Masyarakat Mitra Polhut (MMP)", mpa: "Masyarakat Peduli Api (MPA)", masyarakat: "Masyarakat" };
  const UNSUR_GROUPS = [
    { keys: ["balai"], label: "Petugas Balai Taman Nasional Tambora", short: "petugas Balai Taman Nasional Tambora", id: "NIP" },
    { keys: ["polri"], label: "Personel Kepolisian Negara Republik Indonesia (Polri)", short: "personel Polri", id: "NRP" },
    { keys: ["tni"], label: "Personel Tentara Nasional Indonesia (TNI)", short: "personel TNI", id: "NRP" },
    { keys: ["mmp", "mpa", "masyarakat"], label: "Unsur Masyarakat (MMP, MPA, dan Masyarakat)", short: "orang dari unsur masyarakat (MMP/MPA/masyarakat)", id: "NIK" }
  ];
  function guessUnsur(m) {
    const t = `${m.jabatan || ""} ${m.pangkat || ""} ${m.nama || m.name || ""}`.toLowerCase();
    if (/polri|polsek|polres|polda|bhabinkamtibmas|\b(bripka|brigpol|brigadir|bripda|briptu|bharada|bharatu|bharaka|aiptu|aipda|ipda|iptu|akp|kompol)\b/.test(t)) return "polri";
    if (/\btni\b|koramil|kodim|korem|babinsa|yonif|\b(serka|sertu|serda|serma|pelda|peltu|kopda|koptu|kopka|praka|pratu|prada|letda|lettu|kapten|mayor)\b/.test(t)) return "tni";
    if (/\bmmp\b|mitra polhut|masyarakat mitra/.test(t)) return "mmp";
    if (/\bmpa\b|peduli api/.test(t)) return "mpa";
    return "";
  }
  const unsurGroup = (u) => UNSUR_GROUPS.findIndex((g) => g.keys.includes(u || "masyarakat"));
  // "Tim gabungan berjumlah 6 (enam) orang, terdiri atas 4 (empat) petugas ..., 1 (satu) personel Polri, ..."
  function teamSentence(members) {
    const parts = UNSUR_GROUPS.map((g, i) => ({ g, n: members.filter((m) => unsurGroup(m.unsur) === i).length })).filter((x) => x.n);
    if (!members.length) return "Tim pelaksana belum diisi.";
    if (parts.length === 1) return `Tim pelaksana berjumlah ${nTxt(members.length)} orang ${parts[0].g.short}.`;
    return `Tim pelaksana merupakan tim gabungan berjumlah ${nTxt(members.length)} orang, terdiri atas ${listText(parts.map((x) => `${nTxt(x.n)} ${x.g.short}`))}.`;
  }
  // Ringkas untuk halaman awal: "8 orang (5 petugas Balai TN Tambora, 1 Polri, 1 TNI, 1 masyarakat)"
  function teamShort(members) {
    const SH = ["petugas Balai TN Tambora", "Polri", "TNI", "masyarakat"];
    const parts = UNSUR_GROUPS.map((g, i) => ({ i, n: members.filter((m) => unsurGroup(m.unsur) === i).length })).filter((x) => x.n);
    return `${members.length} orang${parts.length > 1 ? ` (${parts.map((x) => `${x.n} ${SH[x.i]}`).join(", ")})` : parts.length ? ` ${SH[parts[0].i]}` : ""}`;
  }
  // Tabel tim per unsur; label nomor identitas mengikuti unsur (NIP/NRP/NIK)
  function teamTable(members, roleOf) {
    let no = 0;
    const rows = [];
    UNSUR_GROUPS.forEach((g, gi) => {
      const ms = members.filter((m) => unsurGroup(m.unsur) === gi);
      if (!ms.length) return;
      rows.push(`<tr class="grp"><td colspan="5">${String.fromCharCode(65 + rows.filter((r) => r.startsWith('<tr class="grp"')).length)}. ${esc(g.label)} (${ms.length} orang; nomor identitas: ${g.id})</td></tr>`);
      ms.forEach((m) => {
        const role = roleOf ? roleOf(m) : "";
        const id = String(m.nip || "").trim();
        rows.push(`<tr><td class="c">${++no}</td><td>${esc(m.name || m.nama)}${role ? ` <i>(${esc(role)})</i>` : ""}</td><td class="nw">${id ? esc(nb(fmtNip(id))) : "-"}</td><td>${esc(m.pangkat || "-")}</td><td>${esc(m.jabatan || (gi === 3 ? UNSUR[m.unsur] || "Masyarakat" : "-"))}</td></tr>`);
      });
    });
    return `<table class="data team" data-block="tabel_anggota"><thead><tr><th>No</th><th>Nama</th><th>NIP/NRP/NIK</th><th>Pangkat/ Golongan</th><th>Jabatan/ Unsur</th></tr></thead><tbody>${rows.join("") || `<tr><td colspan="5" class="c">Belum ada anggota tim.</td></tr>`}</tbody></table>`;
  }
  function alatTable(rows) {
    const r = rows.filter((x) => (x.nama || "").trim());
    return `<table class="data alat"><thead><tr><th>No</th><th>Jenis Alat dan Bahan</th><th>Jumlah</th><th>Satuan</th></tr></thead><tbody>${r.map((x, i) => `<tr><td class="c">${i + 1}</td><td>${esc(x.nama)}</td><td class="c">${esc(x.jumlah || PH("isi"))}</td><td class="c">${esc(x.sat || "-")}</td></tr>`).join("") || `<tr><td colspan="4" class="c">Belum ada daftar alat dan bahan.</td></tr>`}</tbody></table>`;
  }
  function rabRows(rab) { return rab.filter((r) => (r.jenis || "").trim()).map((r) => ({ ...r, total: numVal(r.vol) * numVal(r.harga) })); }
  // Terbilang rupiah sampai triliunan: 25210000 -> "Dua Puluh Lima Juta Dua Ratus Sepuluh Ribu Rupiah"
  function terbilangRupiah(n) {
    const S = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
    const f = (x) => {
      if (x < 12) return S[x];
      if (x < 20) return f(x - 10) + " belas";
      if (x < 100) return f(Math.floor(x / 10)) + " puluh" + (x % 10 ? " " + f(x % 10) : "");
      if (x < 200) return "seratus" + (x - 100 ? " " + f(x - 100) : "");
      if (x < 1000) return f(Math.floor(x / 100)) + " ratus" + (x % 100 ? " " + f(x % 100) : "");
      if (x < 2000) return "seribu" + (x - 1000 ? " " + f(x - 1000) : "");
      for (const [v, w] of [[1e12, "triliun"], [1e9, "miliar"], [1e6, "juta"], [1e3, "ribu"]])
        if (x >= v) return f(Math.floor(x / v)) + " " + w + (x % v ? " " + f(x % v) : "");
      return "";
    };
    n = Math.round(n || 0);
    return n ? (f(n) + " rupiah").replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Nol Rupiah";
  }
  function rabTable(rows, total) {
    let no = 0, lastMak = null;
    return `<table class="data rab"><thead><tr><th>No</th><th>MAK</th><th>Jenis Belanja</th><th>Volume</th><th>Harga Satuan (Rp)</th><th>Jumlah (Rp)</th></tr></thead><tbody>${rows.map((r) => {
      const first = r.mak !== lastMak; lastMak = r.mak; if (first) no++;
      return `<tr><td class="c">${first ? no : ""}</td><td class="c">${first ? esc(r.mak) : ""}</td><td>${esc(r.jenis)}</td><td class="c">${esc(nb(`${r.vol} ${r.sat}`.trim()))}</td><td class="r">${rp(numVal(r.harga))}</td><td class="r">${rp(r.total)}</td></tr>`;
    }).join("") || `<tr><td colspan="6" class="c">Rincian anggaran belum diisi.</td></tr>`}<tr class="total"><td colspan="5">Total</td><td class="r">${rp(total)}</td></tr><tr><td colspan="6"><i>Terbilang: ${esc(terbilangRupiah(total))}</i></td></tr></tbody></table>`;
  }
  const sumberAnggaran = (year, akun) => {
    const dipa = (window.SRG_DIPA || {})[year] || {};
    const ba = ((dipa.nomor || "").match(/DIPA-?(\d+)/i) || [])[1] || "143";
    return `DIPA BA. ${ba} Balai Taman Nasional Tambora Tahun Anggaran ${year}, Akun ${akun}`;
  };
  function dasarList(profile, I, members) {
    const d = lines(profile.dasarHukum || DEFAULT_DASAR);
    // Judul kegiatan kebakaran: tambah peraturan pengendalian karhutla bila belum ada di daftar Profil
    if (((I.keg && I.keg.fire) || isFire(I.judul)) && !d.some((x) => /P\.32\/MENLHK/i.test(x))) d.push(PERMEN_KARHUTLA);
    if (members.some((m) => m.unsur === "tni")) d.push(MOU_TNI);
    if (members.some((m) => m.unsur === "polri")) d.push(MOU_POLRI);
    if (I.nomorDipa) d.push(`Daftar Isian Pelaksanaan Anggaran (DIPA) ${profile.balai || "Balai Taman Nasional Tambora"} Tahun Anggaran ${I.year} Nomor ${I.nomorDipa}${I.tanggalDipa ? ` tanggal ${tglPanjang(I.tanggalDipa)}` : ""};`);
    d.push(`Surat Tugas Kepala ${profile.balai || "Balai Taman Nasional Tambora"} Nomor ${I.nomorST || "……………"}${I.tanggalST ? ` tanggal ${tglPanjang(I.tanggalST)}` : ""}.`);
    return d;
  }
  function ganttTable(rows) {
    const g0 = rows.reduce((a, r) => (r[1] < a ? r[1] : a), rows[0][1]), g1 = rows.reduce((a, r) => (r[2] > a ? r[2] : a), rows[0][2]);
    const gdays = [];
    for (let d = g0; d <= g1 && gdays.length < 45; d = addDays(d, 1)) gdays.push(d);
    const months = [];
    gdays.forEach((d) => { const m = BULAN[parseISO(d).getUTCMonth()]; const last = months[months.length - 1]; if (last && last.m === m) last.n++; else months.push({ m, n: 1 }); });
    return `<table class="data gantt"><thead><tr><th rowspan="2">No</th><th rowspan="2">Jenis Kegiatan</th>${months.map((m) => `<th colspan="${m.n}">${m.m}</th>`).join("")}</tr><tr>${gdays.map((d) => `<th class="d">${parseISO(d).getUTCDate()}</th>`).join("")}</tr></thead><tbody>${rows.map((r, i) => `<tr><td class="c">${i + 1}.</td><td>${esc(r[0])}</td>${gdays.map((d) => `<td class="${d >= r[1] && d <= r[2] ? "on" : ""}"></td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }
  // Halaman awal: kop, LAPORAN / TENTANG / judul
  function kopHtml(balai) {
    return `<div class="kop">${window.SRG_KOP_LOGO ? `<img src="${window.SRG_KOP_LOGO}" alt="">` : ""}<div class="kop-t"><div>KEMENTERIAN KEHUTANAN</div><div>DIREKTORAT JENDERAL KONSERVASI SUMBER DAYA ALAM DAN EKOSISTEM</div><div class="big">${esc(balai.toUpperCase())}</div></div></div>`;
  }
  function titleHtml(jenis, judul) {
    return `<div class="doc-title"><p>${esc(jenis)}</p><p>TENTANG</p><p>${esc(judul.toUpperCase())}</p></div>`;
  }

  /* ---------- Label ---------- */
  function makeLabeler(dicts) {
    const unknown = new Map();
    const pretty = (key) => { const segs = key.split(".").filter(Boolean); const s = segs[segs.length - 1] || key; return s.charAt(0).toUpperCase() + s.slice(1); };
    const variants = (k) => [k, k.endsWith(".") ? k.slice(0, -1) : k + "."];
    const find = (key) => {
      for (const d of dicts) for (const k of ["items", "categories", "attributes"]) for (const v of variants(key)) if (d[k] && d[k][v]) return fixText(d[k][v]);
      return null;
    };
    const look = (kind, key, attrKey) => {
      if (!key) return "";
      for (const d of dicts) {
        if (attrKey && d.items) for (const v of variants(key)) if (d.items[attrKey + "|" + v]) return fixText(d.items[attrKey + "|" + v]);
        for (const v of variants(key)) if (d[kind] && d[kind][v]) return fixText(d[kind][v]);
      }
      const f = find(key);
      if (f) return f;
      if (!unknown.has(key)) unknown.set(key, { kind, key, guess: pretty(key) });
      return pretty(key);
    };
    return { find, cat: (k) => look("categories", k), attr: (k) => look("attributes", k), item: (k, a) => look("items", k, a), unknown };
  }

  /* ---------- Lapisan peta (grid, zonasi, resort) ---------- */
  function inRing(x, y, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function inGeom(x, y, g) {
    if (!g) return false;
    const poly = (rings) => inRing(x, y, rings[0]) && !rings.slice(1).some((h) => inRing(x, y, h));
    if (g.type === "Polygon") return poly(g.coordinates);
    if (g.type === "MultiPolygon") return g.coordinates.some(poly);
    return false;
  }
  function layerValue(layer, x, y) {
    for (const f of layer.features) {
      if (f._bbox && (x < f._bbox[0] || x > f._bbox[2] || y < f._bbox[1] || y > f._bbox[3])) continue;
      if (inGeom(x, y, f.geometry)) return String(f.properties?.[layer.field] ?? "");
    }
    return "";
  }

  /* ---------- Model ---------- */
  function buildModel(patrol, dicts, settings, layers) {
    const L = makeLabeler(dicts);
    const isSpeciesAttr = (k) => /^(jenis(satwa|tumbuhan|biota)|spesies|species)/i.test(k);
    // Daftar pegawai berurutan sesuai kepangkatan; anggota di luar daftar diisi manual (key = ID SMART)
    const directory = new Map();
    (settings.pegawai || []).forEach((pg, i) => { const k = String(pg.nip || "").replace(/\D/g, ""); if (k && !directory.has(k)) directory.set(k, { ...pg, rank: i }); });
    const manual = settings.manualPegawai || {};

    const members = [], seen = new Set();
    patrol.legs.forEach((lg) => lg.members.forEach((m) => {
      const k = m.employeeId || m.givenName + m.familyName;
      if (seen.has(k)) return;
      seen.add(k);
      const smartName = m.givenName === m.familyName || !m.familyName ? m.givenName : `${m.givenName} ${m.familyName}`;
      const id = String(m.employeeId || "").replace(/\D/g, "");
      const dir = directory.get(id), man = manual[m.employeeId] || {};
      const mem = {
        ...m, smartName, name: (dir && dir.nama) || man.nama || smartName, nip: (dir && dir.nip) || man.nip || m.employeeId,
        jabatan: (dir && dir.jabatan) || man.jabatan || "", pangkat: (dir && dir.pangkat) || man.pangkat || "",
        inDirectory: !!dir, manualOk: !!(man.nama && man.jabatan), rank: dir ? dir.rank : 1e6 + members.length, fromSmart: true
      };
      mem.unsur = dir ? "balai" : man.unsur || guessUnsur(mem) || "";
      mem.unsurOk = !!(dir || man.unsur);
      members.push(mem);
    }));
    // Anggota yang ikut tetapi tidak tercatat di SMART (mis. TNI/Polri, MMP/MPA)
    (settings.extraMembers || []).forEach((x, i) => {
      if (!(x.nama || "").trim()) return;
      const id = String(x.nip || "").replace(/\D/g, ""), dir = directory.get(id);
      members.push({ name: (dir && dir.nama) || x.nama, nip: x.nip || "", jabatan: (dir && dir.jabatan) || x.jabatan || "", pangkat: (dir && dir.pangkat) || x.pangkat || "",
        unsur: dir ? "balai" : x.unsur || guessUnsur(x) || "masyarakat", unsurOk: true, inDirectory: !!dir, manualOk: true, rank: dir ? dir.rank : 2e6 + i, extra: true, smartName: x.nama });
    });
    members.sort((a, b) => unsurGroup(a.unsur) - unsurGroup(b.unsur) || a.rank - b.rank);
    const leader = members.find((m) => m.isLeader);

    const gridLayer = layers.find((l) => l.role === "grid"), zonaLayer = layers.find((l) => l.role === "zonasi"), resortLayer = layers.find((l) => l.role === "resort");
    const days = [], observations = [], waypoints = [], dayLines = [], photos = [];
    patrol.legs.forEach((lg) => lg.days.forEach((d) => {
      const tl = d.tracks.filter((t) => t.length > 1);
      const dist = tl.reduce((s, l) => s + SMART.lineLength(l), 0);
      const times = tl.flat().map((p) => p[2]).filter((t) => t > 1e11);
      const span = Math.max(0, toMin(d.endTime) - toMin(d.startTime));
      const day = {
        no: days.length + 1, date: d.date, transport: L.find(lg.transport) || lg.transport || "", distance: dist,
        start: times.length ? clock(Math.min(...times)) : d.startTime.substr(0, 5),
        end: times.length ? clock(Math.max(...times)) : d.endTime.substr(0, 5),
        rest: d.restMinutes, active: Math.max(0, span - d.restMinutes), nObs: 0, color: DAY_COLORS[days.length % DAY_COLORS.length]
      };
      day.drone = isDrone(day.transport);
      days.push(day);
      tl.forEach((l) => dayLines.push({ coords: l, color: day.color, day: day.no }));
      for (const w of d.waypoints) {
        waypoints.push(w);
        w.grid = gridLayer ? layerValue(gridLayer, w.x, w.y) : "";
        w.zona = zonaLayer ? layerValue(zonaLayer, w.x, w.y) : "";
        w.resort = resortLayer ? layerValue(resortLayer, w.x, w.y).replace(/^resor[t]?\s+/i, "") : "";
        const obsList = w.observations.length ? w.observations : [{ category: "", attributes: [], photos: [] }];
        obsList.forEach((o) => {
          const top = (o.category || "").split(".")[0];
          const attrs = o.attributes.map((a) => ({
            key: a.key, label: L.attr(a.key), raw: a.values,
            text: a.values.map((v) => (v.kind === "item" ? L.item(v.value, a.key) : v.kind === "number" ? fmtNum(v.value) : v.kind === "bool" ? (v.value ? "Ya" : "Tidak") : v.value)).join(", ")
          })).filter((a) => a.text !== "");
          const get = (k) => attrs.find((a) => a.key === k);
          const sp = attrs.find((a) => isSpeciesAttr(a.key));
          const jumlah = attrs.find((a) => a.key === "jumlah" && a.raw[0] && a.raw[0].kind === "number");
          const follow = get("perlutindaklanjut");
          const ob = {
            no: observations.length + 1, wp: w, day, category: o.category,
            catLabel: o.category ? L.cat(o.category) : "Titik tanpa kategori", top, topLabel: top ? L.cat(top + ".") : "Lainnya",
            attrs, species: sp ? sp.text : "", speciesKey: sp ? (sp.raw[0] || {}).value : "",
            count: jumlah ? jumlah.raw[0].value : null, unit: get("satuan") ? get("satuan").text : "",
            followUp: follow ? /^(ya|yes|y|perlu)$/i.test((follow.raw[0] || {}).value || "") : false, photos: []
          };
          ob.unidentified = !!sp && isUnidentified(ob.speciesKey, ob.species);
          ob.fire = isFire(o.category) || isFire(ob.catLabel);
          for (const f of new Set([...(o.photos || []), ...(w.photos || [])])) { const p = { file: f, ob }; ob.photos.push(p); photos.push(p); }
          observations.push(ob);
          day.nObs++;
        });
      }
    }));

    // Kategori utama: urutan LPK, lalu urutan kemunculan
    const tops = [...new Set(observations.map((o) => o.top))].sort((a, b) => {
      const ia = TOP_ORDER.indexOf(a), ib = TOP_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    const color = {};
    let spare = 0;
    tops.forEach((t) => (color[t] = TOP_COLORS[t] || SPARE[spare++ % SPARE.length]));
    observations.forEach((o) => (o.color = color[o.top]));
    const coordKey = (w) => `${w.x.toFixed(5)},${w.y.toFixed(5)}`;
    const groups = tops.map((t) => {
      const items = observations.filter((o) => o.top === t).sort((a, b) => (a.wp.date + a.wp.time).localeCompare(b.wp.date + b.wp.time));
      const subs = [];
      for (const o of items) { let s = subs.find((x) => x.key === o.category); if (!s) subs.push((s = { key: o.category, label: o.catLabel, n: 0 })); s.n++; }
      const species = new Map();
      for (const o of items.filter((x) => x.species && !x.unidentified)) {
        const k = o.speciesKey || o.species;
        if (!species.has(k)) species.set(k, { name: o.species, records: 0, total: 0, unit: o.unit });
        const s = species.get(k); s.records++; if (o.count != null) s.total += o.count;
      }
      return { top: t, label: items[0].topLabel, color: color[t], items, subs, coords: new Set(items.map((o) => coordKey(o.wp))).size,
        species: [...species.values()].sort((a, b) => b.records - a.records), unidentified: items.filter((o) => o.unidentified).length };
    });
    // Kemungkinan pencatatan ganda: kategori, jenis, tanggal, dan koordinat sama. Tidak dihapus, hanya ditandai.
    const dupMap = new Map();
    observations.forEach((o) => {
      if (!o.category) return;
      const k = [o.category, o.speciesKey || o.species, o.wp.date, coordKey(o.wp)].join("|");
      if (!dupMap.has(k)) dupMap.set(k, []);
      dupMap.get(k).push(o);
    });
    const duplicates = [...dupMap.values()].filter((a) => a.length > 1);
    duplicates.forEach((a) => a.forEach((o) => (o.dup = true)));

    // Foto: aktivitas manusia tampil di bagian hasil, keanekaragaman hayati dan lainnya di lampiran
    photos.forEach((p) => { p.place = p.ob.top === "aktivitasmanusia" ? "hasil" : BIODIV.includes(p.ob.top) || p.ob.species ? "biodiv" : "kegiatan"; });

    // Jarak per moda; jarak hari dibulatkan dua desimal dan total = jumlah angka yang ditampilkan
    const modes = new Map();
    days.forEach((d) => { d.km = Math.round(d.distance / 10) / 100; const k = d.transport || "Tidak tercatat"; modes.set(k, (modes.get(k) || 0) + d.km); });
    const uniq = (arr) => [...new Set(arr.filter(Boolean))];
    const sortNum = (a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0) || String(a).localeCompare(String(b));
    const obsWps = waypoints.filter((w) => w.observations.length);
    return {
      patrol, members, leader, days, observations, waypoints, groups, photos, dayLines, color, tops, duplicates,
      modes: [...modes.entries()].map(([mode, km]) => ({ mode, km: Math.round(km * 100) / 100, drone: isDrone(mode) })),
      grids: uniq(waypoints.map((w) => w.grid)).sort(sortNum), zonas: uniq(waypoints.map((w) => w.zona)), resorts: uniq(waypoints.map((w) => w.resort)),
      hasLayers: { grid: !!gridLayer, zonasi: !!zonaLayer, resort: !!resortLayer },
      totals: {
        distance: days.reduce((s, d) => s + d.distance, 0), km: Math.round(days.reduce((s, d) => s + d.km, 0) * 100) / 100,
        kmGround: Math.round(days.filter((d) => !d.drone).reduce((s, d) => s + d.km, 0) * 100) / 100,
        kmDrone: Math.round(days.filter((d) => d.drone).reduce((s, d) => s + d.km, 0) * 100) / 100,
        active: days.reduce((s, d) => s + d.active, 0), days: new Set(days.map((d) => d.date)).size, obs: observations.length,
        wps: waypoints.length, coords: new Set(obsWps.map(coordKey)).size, photos: photos.length
      },
      unknown: L.unknown, labeler: L
    };
  }

  /* ---------- Info kegiatan turunan ---------- */
  // "... di Kawasan TN Tambora" menjadi "... di Wilayah Kerja X Kawasan TN Tambora" agar kata "di" tidak ganda
  const judulLengkap = (judul, lokasi) => {
    if (!lokasi) return judul;
    const m = judul.match(/^(.*?)\s+di\s+(Kawasan .*)$/i);
    return m ? `${m[1]} di Wilayah Kerja ${lokasi}, ${m[2]}` : `${judul} di Wilayah Kerja ${lokasi}`;
  };
  function deriveInfo(M, info, profile) {
    const p = M.patrol;
    const mulai = info.tglMulai || p.startDate, selesai = info.tglSelesai && info.tglSelesai >= mulai ? info.tglSelesai : (info.tglMulai && info.tglMulai > p.endDate ? info.tglMulai : p.endDate);
    const year = (mulai || "").substr(0, 4);
    const dipa = (window.SRG_DIPA || {})[year] || {};
    const looksST = /^ST\.|\/T\.\d+\//i.test(p.id || "");
    const judul = info.judul || p.mandate || "SMART Patrol";
    const lokasi = info.lokasi || p.station || "";
    const grids = info.grids || (M.grids.length ? M.grids.join(", ") : "");
    const penyusun = (info.penyusunNip && M.members.find((m) => m.employeeId && String(m.employeeId) === String(info.penyusunNip))) || M.leader || M.members[0];
    const akun = (info.akun || DEFAULT_AKUN).trim();
    const rab = rabRows(info.rab || []), total = rab.reduce((s, r) => s + r.total, 0);
    return {
      judul, lokasi, judulLengkap: judulLengkap(judul, lokasi), grids,
      gridText: grids ? `Grid ${grids.replace(/,\s*([^,]+)$/, ", dan $1")}` : "",
      resort: info.resort || M.resorts.join(", "), akun, rab, total,
      sumberAnggaran: sumberAnggaran(year, akun), anggaran: rupiah(total), tanggalST: info.tanggalST || "", nomorDipa: dipa.nomor || "", tanggalDipa: dipa.tanggal || "",
      nomorST: (info.nomorST || "").trim() || (looksST ? p.id : ""), mulai, selesai, hari: Math.round((parseISO(selesai) - parseISO(mulai)) / 864e5) + 1,
      tanggalLaporan: info.tanggalLaporan || addDays(selesai, 3), kota: info.tempatTtd || profile.kota || "", penyusun,
      rencanaHari: Math.max(0, Number(info.rencanaHari ?? 1)), year, alat: info.alat || alatFor(kegiatanOf(judul)), metodeText: profile.metode, keg: kegiatanOf(judul), fire: isFire(judul) || !!(kegiatanOf(judul) || {}).fire || M.observations.some((o) => o.fire)
    };
  }

  /* ---------- Teks otomatis (bisa diedit di laporan) ---------- */
  function autoNotes(M, I) {
    const t = M.totals;
    const where = I.gridText ? ` yang difokuskan pada ${I.gridText}` : "";
    const g = (top) => M.groups.find((x) => x.top === top);
    const am = g("aktivitasmanusia"), fires = M.observations.filter((o) => o.fire);
    const zonaTxt = M.zonas.length ? `, zona ${listText(M.zonas.map((z) => z.replace(/^zona\s+/i, "")))}` : "";
    const resorTxt = I.resort ? `, Resor ${I.resort}` : "";
    const K = I.keg, kt = (x) => kegText(x, false, M.members), num1 = (a) => a.map((x, i) => `${i + 1}. ${kt(x)}`);
    const tujuan = K && K.tujuan ? num1(K.tujuan) : I.fire ? [
      "1. Mendeteksi secara dini indikasi kebakaran hutan dan lahan, termasuk titik api aktif dan bekas terbakar;",
      "2. Memantau lokasi rawan kebakaran serta aktivitas manusia yang berpotensi menjadi sumber api;",
      "3. Melakukan tindakan awal dan melaporkan api aktif yang ditemukan untuk ditindaklanjuti;",
      "4. Mengumpulkan data kondisi tutupan lahan, sumber air, serta sarana prasarana dan batas kawasan;",
      "5. Menyediakan data spasial yang valid sebagai dasar pengambilan kebijakan pengendalian kebakaran dan pengelolaan kawasan."
    ] : [
      "1. Mendeteksi dan mendokumentasikan aktivitas manusia dan gangguan kawasan secara dini;",
      "2. Mengumpulkan data keanekaragaman hayati, kondisi ekosistem, dan tutupan lahan;",
      "3. Memeriksa kondisi sarana prasarana, sumber air, dan batas kawasan;",
      "4. Menyediakan data spasial yang valid sebagai dasar pengambilan kebijakan pengelolaan kawasan."
    ];
    const daysTxt = M.days.map((d) => `${tglPanjang(d.date)} pukul ${d.start}–${d.end}`).join("; ");
    const modeTxt = M.modes.map((m) => (m.drone ? `±${num(m.km, 2)} km lintasan penerbangan drone` : `±${num(m.km, 2)} km dengan moda ${m.mode.toLowerCase()}`)).join(" dan ");
    const notes = {
      latar: [
        "Taman Nasional Tambora merupakan kawasan konservasi yang ditetapkan untuk melindungi keunikan ekosistem pascaletusan tahun 1815, melalui Keputusan Menteri Lingkungan Hidup dan Kehutanan Nomor SK.111/Menlhk-II/2015 dengan luas 71.645,64 hektare. Kawasan ini dikelola oleh Balai Taman Nasional Tambora untuk mempertahankan nilai-nilai konservasi sumber daya alam hayati dan ekosistemnya.",
        `Pengelolaan kawasan dibagi ke dalam beberapa wilayah kerja, salah satunya ${I.lokasi}. Tekanan terhadap kawasan, seperti perambahan, pembalakan liar, perburuan satwa, dan kebakaran hutan dan lahan, menuntut pola pengamanan yang berbasis data dan teknologi.${K && K.konteks ? " " + K.konteks : ""}`,
        `Oleh karena itu, dilaksanakan kegiatan ${I.judulLengkap} pada tanggal ${periodeSd(I.mulai, I.selesai)}${where}. Dengan metode Spatial Monitoring and Reporting Tool (SMART), setiap temuan di lapangan dapat terdeteksi secara dini, terdokumentasi secara akurat, dan ditindaklanjuti secara cepat.`
      ].join("\n"),
      maksud: [
        `Kegiatan ${I.judulLengkap} dimaksudkan sebagai upaya ${K && K.maksud ? K.maksud : `${I.fire ? "pencegahan kebakaran hutan dan lahan serta " : ""}pengamanan dan pemantauan kawasan Taman Nasional Tambora secara terukur dan berbasis data`}${I.gridText ? `, khususnya pada ${I.gridText}` : ""}.`,
        "Adapun tujuan kegiatan ini adalah:", ...tujuan
      ].join("\n"),
      ruanglingkup: [
        `Ruang lingkup kegiatan secara kewilayahan mencakup wilayah kerja ${I.lokasi}, Balai Taman Nasional Tambora${I.gridText ? `, khususnya pada ${I.gridText}` : ""}. Ruang lingkup materi kegiatan meliputi:`,
        ...(K && K.ruang ? num1(K.ruang) : [
          `1. Melakukan pelacakan dan pendataan terhadap indikasi aktivitas manusia${I.fire ? " dan indikasi kebakaran" : ""} di dalam kawasan;`,
          "2. Mengamati kondisi tutupan hutan, keberadaan satwa liar dan tumbuhan, serta potensi titik api;",
          "3. Memberikan imbauan kepada masyarakat yang ditemukan beraktivitas di dalam kawasan;",
          "4. Melakukan input data lapangan menggunakan aplikasi SMART Mobile, termasuk titik koordinat dan dokumentasi visual temuan."])
      ].join("\n"),
      lokasi: [
        `Lokasi kegiatan berada di wilayah kerja ${I.lokasi}${resorTxt}${I.gridText ? `, pada ${I.gridText}` : ""}${zonaTxt}. Jalur patroli yang terekam sepanjang ${modeTxt || "±" + num(t.km, 2) + " km"}.`,
        PH("Uraikan kondisi spesifik lokasi: topografi, tutupan vegetasi, aksesibilitas, kondisi jalan atau jalur patroli, sumber air, dan permukiman terdekat")
      ].join("\n"),
      waktu: [
        `Kegiatan ${I.judulLengkap} dilaksanakan selama ${nTxt(I.hari)} hari, terhitung mulai tanggal ${periodeSd(I.mulai, I.selesai)} sesuai Surat Tugas. Waktu tersebut merupakan keseluruhan waktu kerja tim, termasuk persiapan, perjalanan menuju lokasi, pelaksanaan patroli, dan kembali ke kantor.`,
        `Perekaman data SMART dilakukan pada ${nTxt(t.days)} hari, yaitu ${daysTxt}. Jam pada tabel berikut adalah sesi perekaman SMART (awal dan akhir track yang terekam), bukan keseluruhan waktu kerja harian tim.`
      ].join("\n"),
      metode: metodeLines(I.metodeText, K).map((x, i) => `${i + 1}. ${x}`).join("\n"),
      analisis: [
        "Data hasil patroli diunduh dari SMART Mobile ke SMART Desktop, kemudian diverifikasi meliputi kesesuaian kategori temuan, koordinat, tanggal, foto, dan kemungkinan pencatatan ganda.",
        `Data yang telah diverifikasi dianalisis secara deskriptif kuantitatif: jumlah catatan per kategori, jumlah titik koordinat unik, jumlah jenis yang teridentifikasi, serta sebaran temuan per grid patroli 1 km × 1 km, zona, dan resor melalui tumpang susun (overlay) dengan peta kerja Balai. Panjang lintasan dihitung dari track GPS per hari dan dipisahkan menurut moda${M.modes.some((m) => m.drone) ? " (lintasan darat dan penerbangan drone)" : ""}. Hasil analisis disajikan dalam tabel, peta sebaran, dan dokumentasi.`,
        ...(K && K.analisis ? [kt(K.analisis)] : [])
      ].join("\n"),
      hasil: `Selama pelaksanaan kegiatan, tim mencatat ${t.obs} catatan temuan pada ${t.coords} titik koordinat unik${I.gridText ? ` di ${I.gridText}` : ""}${resorTxt ? " wilayah" + resorTxt.replace(/^,/, "") : ""}, terdiri atas ${listText(M.groups.map((x) => `${x.items.length} catatan ${x.label.toLowerCase()}`))}. Satu titik koordinat dapat memuat lebih dari satu catatan, sehingga jumlah catatan tidak sama dengan jumlah titik lokasi atau jumlah kejadian.`,
      pembahasan: "", kesimpulan: "", saran: "",
      penutup: `Demikian laporan pelaksanaan kegiatan ${I.judulLengkap} ini disusun sebagai pertanggungjawaban pelaksanaan Surat Tugas Nomor ${I.nomorST || "……………"} dan sebagai bahan pertimbangan pimpinan dalam pengambilan kebijakan pengelolaan kawasan Taman Nasional Tambora. Atas perhatian dan arahan pimpinan, kami ucapkan terima kasih.`
    };
    for (const gr of M.groups) {
      const subs = gr.subs.map((s) => `${s.label.toLowerCase()} (${s.n})`).join(", ");
      let sp = "";
      if (gr.species.length || gr.unidentified) {
        sp = ` Dari ${gr.items.length} catatan tersebut, ${gr.species.length} jenis telah teridentifikasi${gr.species.length ? `, antara lain ${gr.species.slice(0, 5).map((s) => s.name).join(", ")}` : ""}`;
        sp += gr.unidentified ? `, sedangkan ${gr.unidentified} catatan berstatus "Belum ada di daftar aplikasi", yaitu jenisnya belum tersedia dalam daftar jenis aplikasi SMART sehingga ${PH("jelaskan: sudah diidentifikasi sebagai … / masih perlu identifikasi lanjutan")} dan tidak dihitung sebagai jenis tersendiri.` : ".";
      }
      notes["hasil_" + gr.top] = `Tim mencatat ${gr.items.length} catatan ${gr.label.toLowerCase()} pada ${gr.coords} titik koordinat, berupa ${subs}.${sp} Rincian catatan disajikan pada tabel berikut:`;
      if (gr.top === "aktivitasmanusia" && gr.subs.some((s) => /penggembalaan|ternak|madu|hhbk/i.test(s.label)))
        notes["hasil_" + gr.top] += `\nUntuk catatan penggembalaan dan pengambilan hasil hutan bukan kayu (HHBK) seperti madu: ${PH("jumlah orang/ternak bila tercatat, status akses atau izin, penggunaan api, imbauan atau edukasi yang diberikan, dan tindak lanjut")}. Catatan aktivitas manusia tidak otomatis merupakan pelanggaran sampai diverifikasi.`;
    }
    // Pembahasan: menghubungkan lokasi, aktivitas manusia, vegetasi, api, penanganan, dan keterbatasan pengamatan
    const pem = [], kes = [], sar = [];
    const prioritas = am ? [...new Set(am.items.map((o) => o.wp.grid).filter(Boolean))] : [];
    if (am) pem.push(`Catatan aktivitas manusia (${am.items.length} catatan pada ${am.coords} titik koordinat) terutama berupa ${listText(am.subs.map((s) => `${s.label.toLowerCase()} (${s.n})`))}${prioritas.length ? ` dan terkonsentrasi di Grid ${listText(prioritas)}` : ""}. Hal ini menunjukkan masih adanya interaksi masyarakat dengan kawasan yang perlu dipantau. ${PH("hubungkan dengan kondisi lokasi, akses, dan musim")}`);
    if (fires.length) pem.push(`Indikasi kebakaran tercatat pada ${fires.length} catatan. Untuk api aktif: waktu penemuan ${PH("jam")}, tindakan tim ${PH("dipadamkan/dilokalisasi/dilaporkan")}, alat yang digunakan ${PH("…")}, kendala ${PH("…")}, dan kondisi terakhir ${PH("padam/masih berasap/perlu pemeriksaan ulang")}. Luas terbakar ${PH("… ha")} diukur dengan ${PH("metode: tracking keliling GPS/digitasi citra/estimasi visual")}${PH("tanggal kejadian bila diketahui")}; sumber api ${PH("bedakan pengamatan langsung, informasi pihak lain, dan dugaan")}. Angka jumlah pada tabel menunjukkan objek yang dihitung (mis. batang terbakar), bukan luas kebakaran.`);
    const bio = M.groups.filter((x) => BIODIV.includes(x.top));
    if (bio.length) pem.push(`Pemantauan keanekaragaman hayati mencatat ${listText(bio.map((x) => `${x.items.length} catatan ${x.label.toLowerCase()} (${x.species.length} jenis teridentifikasi${x.unidentified ? `, ${x.unidentified} belum ada di daftar aplikasi` : ""})`))}. ${PH("kaitkan dengan kondisi vegetasi dan habitat di jalur patroli; jelaskan satuan jumlah satwa: individu/koloni/sarang, dan dasar identifikasi jenis penting")}`);
    const gc = g("groundcheck"), ft = g("fitur");
    if (gc) pem.push(`Ground check pada ${gc.items.length} titik memberikan data tutupan lahan aktual. Klasifikasi tutupan lahan didasarkan pada ${PH("dasar klasifikasi: pengamatan visual struktur vegetasi/kriteria tutupan lahan yang digunakan")}.`);
    if (ft) pem.push(`Pengamatan fitur (${ft.items.length} catatan, berupa ${listText(ft.subs.map((s) => s.label.toLowerCase()))}) memberikan informasi kondisi sarana prasarana, batas kawasan, dan sumber air. ${PH("jelaskan kondisi yang diamati, termasuk mata air, dan alasan perlu/tidak perlu tindak lanjut")}`);
    if (K) pem.push(...(K.pembahasan || []).map(kt));
    pem.push(`Lintasan yang terekam sepanjang ${modeTxt || "±" + num(t.km, 2) + " km"}. Keterbatasan pengamatan: ${PH("cuaca, akses, waktu perekaman yang tidak mencakup seluruh hari kerja, sinyal GPS, dan hal lain yang memengaruhi data")}.`);
    if (M.duplicates.length) pem.push(`Terdapat ${M.duplicates.length} kelompok catatan dengan kategori, jenis, tanggal, dan koordinat yang sama. ${PH("jelaskan apakah merupakan pengamatan berbeda atau pencatatan ganda berdasarkan waktu/ID temuan")}`);
    kes.push(am ? `Masih terdapat ${am.items.length} catatan aktivitas manusia di dalam kawasan pada ${am.coords} titik koordinat, berupa ${listText(am.subs.map((s) => s.label.toLowerCase()))}.` : "Tidak tercatat aktivitas manusia yang mengganggu kawasan selama patroli.");
    if (fires.length) kes.push(`Tercatat ${fires.length} catatan indikasi kebakaran; ${PH("kondisi terakhir api aktif dan hasil penanganan")}.`);
    if (bio.length) kes.push(`Keanekaragaman hayati yang tercatat meliputi ${listText(bio.map((x) => `${x.species.length} jenis ${x.label.toLowerCase()} teridentifikasi`))}.`);
    kes.push(`Kondisi sarana prasarana dan batas kawasan: ${ft ? PH("ringkas kondisi") : PH("tidak ada catatan fitur; jelaskan bila ada pengamatan")}. Kondisi sumber air: ${PH("…")}. Kondisi tutupan lahan: ${gc ? PH("ringkas hasil ground check") : PH("…")}.`);
    if (prioritas.length) sar.push(`Menetapkan Grid ${listText(prioritas)} sebagai lokasi prioritas patroli lanjutan, dilaksanakan oleh ${PH("pelaksana")} pada ${PH("waktu tindak lanjut")}.`);
    if (fires.length) sar.push(`Melakukan pemeriksaan ulang bara/api pada lokasi kebakaran dalam ${PH("waktu")} serta pendalaman sumber api bersama ${PH("pihak terkait")}.`);
    if (am) sar.push("Menindaklanjuti catatan aktivitas manusia melalui verifikasi lapangan, imbauan, dan edukasi kepada masyarakat sesuai prosedur.");
    const inv = g("spesiesinvasif");
    if (inv) sar.push(`Melakukan pemantauan dan pengendalian spesies invasif (${inv.species.slice(0, 3).map((s) => s.name).join(", ")}) di lokasi temuan.`);
    const unid = M.groups.reduce((s, x) => s + x.unidentified, 0);
    if (unid) sar.push(`Melakukan identifikasi lanjutan terhadap ${unid} catatan jenis yang belum ada di daftar aplikasi dan mengusulkan penambahan ke Data Model SMART.`);
    if (K) sar.push(...(K.saran || []).map(kt));
    sar.push("Melanjutkan patroli rutin pada jalur dan grid yang sama untuk pemantauan berkala.");
    notes.pembahasan = pem.map((x, i) => `${i + 1}. ${x}`).join("\n");
    notes.kesimpulan = [`Berdasarkan kegiatan ${I.judulLengkap}, dapat disimpulkan sebagai berikut:`, ...kes.map((x, i) => `${i + 1}. ${x}`)].join("\n");
    notes.saran = ["Rekomendasi tindak lanjut berdasarkan hasil kegiatan adalah sebagai berikut:", ...sar.map((x, i) => `${i + 1}. ${x}`)].join("\n");
    // Singkatan dijelaskan pada penggunaan pertama
    let hhbk = false;
    for (const k of ["latar", "maksud", "ruanglingkup", "lokasi", "hasil", ...M.groups.map((x) => "hasil_" + x.top), "pembahasan", "kesimpulan", "saran"]) {
      if (!notes[k]) continue;
      notes[k] = notes[k].replace(/hasil hutan bukan kayu \(HHBK\)|HHBK/g, (m) => { if (hhbk) return "HHBK"; hhbk = true; return "hasil hutan bukan kayu (HHBK)"; });
    }
    return notes;
  }

  /* ---------- Kesiapan data ---------- */
  const hasPH = (notes) => Object.values(notes || {}).some((v) => /\[[^\]]+\]/.test(v || ""));
  function readiness(M, I, info, profile, notes, scans) {
    const missingDir = M.members.filter((m) => !m.inDirectory && !m.manualOk);
    const noUnsur = M.members.filter((m) => !m.unsurOk);
    const alatKosong = I.alat.filter((x) => (x.nama || "").trim() && !String(x.jumlah || "").trim());
    const sumGroups = M.groups.reduce((s, x) => s + x.items.length, 0), sumDays = M.days.reduce((s, d) => s + d.nObs, 0);
    return [
      { label: "File ekspor patroli SMART", ok: true, note: `${M.totals.obs} catatan pada ${M.totals.coords} titik koordinat unik, ${M.totals.photos} foto` },
      { label: "Jumlah catatan harian = jumlah tabel kategori", ok: sumGroups === sumDays, note: `${sumDays} catatan harian, ${sumGroups} di tabel kategori` },
      { label: "Data Model SMART (nama kategori dan jenis)", ok: M.unknown.size === 0, note: M.unknown.size ? `${M.unknown.size} kode belum punya nama` : "semua kode punya nama" },
      { label: "Kemungkinan pencatatan ganda", ok: !M.duplicates.length, note: M.duplicates.length ? M.duplicates.map((a) => `${a[0].species || a[0].catLabel} ${a[0].wp.date} (WP ${a.map((o) => o.wp.id + " " + o.wp.time.substr(0, 5)).join(", ")})`).slice(0, 3).join("; ") + " — periksa, jangan langsung dihapus" : "" },
      { label: "Judul kegiatan (mandat patroli)", ok: !!(info.judul || M.patrol.mandate), note: `"${I.judul}"${I.keg ? (I.keg.judul === I.judul ? "" : `; narasi mengikuti judul baku "${I.keg.judul}"`) : "; tidak cocok dengan judul baku, narasi umum dipakai"}` },
      { label: "Nomor dan tanggal Surat Tugas", ok: !!(I.nomorST && I.tanggalST), note: I.nomorST || "ID patroli bukan nomor ST, isi manual" },
      { label: "Scan Surat Tugas untuk lampiran", ok: (scans || []).length > 0, note: (scans || []).length ? `${scans.length} halaman` : "" },
      { label: `DIPA TA.${I.year}`, ok: !!(I.nomorDipa && I.tanggalDipa), note: I.nomorDipa ? I.nomorDipa : "belum ada di data/dipa.json" },
      { label: "Rincian anggaran", ok: I.total > 0, note: I.anggaran },
      { label: "Tanggal pelaksanaan sesuai ST", ok: !!(info.tglMulai && info.tglSelesai), note: `${periodeSd(I.mulai, I.selesai)}${info.tglMulai ? "" : " (sementara dari data SMART)"}` },
      { label: "Nama bergelar dan jabatan anggota", ok: !missingDir.length, note: missingDir.length ? `isi manual: ${missingDir.map((m) => m.smartName).join(", ")}` : "" },
      { label: "Unsur anggota (Balai/Polri/TNI/masyarakat)", ok: !noUnsur.length, note: noUnsur.length ? `pilih unsur: ${noUnsur.map((m) => m.smartName).join(", ")}` : "" },
      kegTeamCheck(I.keg, M.members),
      { label: "Jumlah alat dan bahan yang digunakan", ok: !alatKosong.length, note: alatKosong.length ? `${alatKosong.length} baris belum diisi jumlahnya` : "" },
      { label: "Kepala Balai dan Kasubbag TU (nama, NIP)", ok: !!(profile.kepalaBalaiNama && profile.kepalaBalaiNip && profile.kasubbagNama && profile.kasubbagNip) },
      { label: "Lapisan grid dan zonasi", ok: (M.hasLayers.grid && M.hasLayers.zonasi) || !!info.grids, note: M.hasLayers.grid ? `grid: ${M.grids.join(", ") || "-"}${M.zonas.length ? "; " + M.zonas.join(", ") : ""}` : info.grids ? "diisi manual" : "" },
      { label: "Tempat dan tanggal penandatanganan", ok: !!info.tanggalLaporan, note: `${I.kota || "…"}, ${info.tanggalLaporan ? tglPanjang(I.tanggalLaporan) : "sementara " + tglPanjang(I.tanggalLaporan)}` },
      { label: "Isian bertanda [ … ] di narasi sudah dilengkapi", ok: !hasPH(notes), note: hasPH(notes) ? "cari teks berlatar kuning bertanda kurung siku" : "" },
      { label: "Narasi sudah diperiksa", ok: !!info.narasiOk, note: "centang setelah teks diperiksa" }
    ].filter(Boolean);
  }

  /* ---------- HTML ---------- */
  const xy = (v) => (isFinite(v) ? v.toFixed(6) : "");

  // Isian [ … ] disorot supaya mudah ditemukan; teks tetap bisa diedit langsung
  function noteBlock(notes, key, cls = "para") {
    return `<div class="note ${cls}" contenteditable="true" data-note="${key}">${esc(notes[key] || "").replace(/\[([^\]]+)\]/g, '<mark class="ph">[$1]</mark>').replace(/(\s-\s)([A-Z][a-z]+ [a-z]{3,}(?: [a-z]{3,})?)(?=[\s,.;)]|$)/gm, "$1<i>$2</i>").replace(/\n/g, "<br>")}</div>`;
  }

  function sign(lines, name, nip) {
    return `<div class="sg">${lines.map((l) => `<div>${esc(l)}</div>`).join("")}<div class="space"></div><div class="nm">${esc(name || "……………………………")}</div><div>NIP. ${esc(fmtNip(nip) || "……………………")}</div></div>`;
  }

  function columnsFor(gr, M) {
    const multi = gr.subs.length > 1 || gr.subs[0].label !== gr.label;
    const keys = [];
    gr.items.forEach((o) => o.attrs.forEach((a) => { if (!keys.includes(a.key)) keys.push(a.key); }));
    const rank = (k) => (/^jenis(satwa|tumbuhan|biota)/.test(k) ? 0 : k === "tipetemuan" ? 1 : k === "jumlah" ? 2 : k === "satuan" ? 3 : /^keterangan/.test(k) ? 9 : 5);
    keys.sort((a, b) => rank(a) - rank(b));
    const PREF = {
      aktivitasmanusia: ["tipetemuan", "jumlah", "satuan", "keterangan"],
      satwaliar: ["jenissatwa", "jumlah", "satuan", "tipetemuan"],
      tumbuhan: ["jenistumbuhan", "tipetemuan"],
      spesiesinvasif: ["jenistumbuhan", "jumlah", "satuan"],
      fitur: ["tipetemuan", "kondisi", "nopal", "perlutindaklanjut"]
    };
    if (PREF[gr.top]) { const pk = PREF[gr.top].filter((k) => keys.includes(k)); if (pk.length) keys.splice(0, keys.length, ...pk); }
    else if (keys.length > 6) keys.splice(6);
    const labelOf = (k) => gr.items.flatMap((o) => o.attrs).find((a) => a.key === k).label;
    return { multi, keys, heads: keys.map(labelOf), grid: M.hasLayers.grid, zona: M.hasLayers.zonasi };
  }

  function photoFig(p, url, caption) {
    return `<figure>${url ? `<img src="${url}" alt="">` : `<div class="nophoto">${esc(p.file)}</div>`}<figcaption>${caption}</figcaption></figure>`;
  }

  function renderHTML(M, profile, info, notes, maps, photoUrls, scans) {
    const I = deriveInfo(M, info, profile), t = M.totals;
    const balai = profile.balai || "Balai Taman Nasional Tambora";
    const pengesahanTgl = tglPanjang(I.tanggalLaporan);
    const h2 = (txt, pb) => `<h2 class="sec${pb ? " pb" : ""}">${esc(txt)}</h2>`, h3 = (txt) => `<h3>${esc(txt)}</h3>`;

    /* Halaman awal: kop, LAPORAN / TENTANG / judul, identitas dan pengesahan */
    const kv = [
      ["Judul Kegiatan", I.judulLengkap], ["Nomor Surat Tugas", `${I.nomorST || "……………"}${I.tanggalST ? ` tanggal ${tglPanjang(I.tanggalST)}` : ""}`],
      ["Waktu Kegiatan", periodeSd(I.mulai, I.selesai)], ["Lokasi Kegiatan", `${I.lokasi}${I.gridText ? `, ${I.gridText}` : ""}`],
      ["Pelaksana", `Tim ${teamShort(M.members)}`], ["Jumlah Anggaran", I.anggaran || "Rp……………"],
      ["Sumber Anggaran", I.sumberAnggaran], ["Disusun di", I.kota || "……………"], ["Pada Tanggal", pengesahanTgl]
    ];
    const front = [kopHtml(balai), titleHtml("LAPORAN", `Pelaksanaan Kegiatan ${I.judulLengkap}${/tambora/i.test(I.judulLengkap) ? "" : " " + balai.replace(/^Balai\s+/i, "")}`),
      `<table class="kv-plain">${kv.map(([k, v]) => `<tr><td>${esc(k)}</td><td>:</td><td>${esc(v)}</td></tr>`).join("")}</table>
      <table class="sign"><tr><td>${sign(["Menyetujui,", profile.kasubbagJabatan || "Kepala Subbagian Tata Usaha,"], profile.kasubbagNama, profile.kasubbagNip)}</td>
      <td>${sign(["", "Ketua Tim Pelaksana,"], I.penyusun ? I.penyusun.name : "", I.penyusun ? I.penyusun.nip : "")}</td></tr>
      <tr><td colspan="2">${sign(["Mengetahui,", `Kepala ${balai},`], profile.kepalaBalaiNama, profile.kepalaBalaiNip)}</td></tr></table>`];

    const body = [];
    /* A. Pendahuluan */
    body.push(h2("A. PENDAHULUAN"), h3("1. Latar Belakang"), noteBlock(notes, "latar"), h3("2. Maksud dan Tujuan"), noteBlock(notes, "maksud"), h3("3. Ruang Lingkup"), noteBlock(notes, "ruanglingkup"),
      h3("4. Dasar"), `<p class="para">Dasar pelaksanaan kegiatan ${esc(I.judulLengkap)} adalah sebagai berikut:</p>`,
      `<ol class="list">${dasarList(profile, I, M.members).map((d) => `<li>${esc(d.replace(/^\d+[.)]\s*/, ""))}</li>`).join("")}</ol>`);

    /* B. Pelaksanaan kegiatan */
    const modesRow = M.modes.length > 1 ? `<p class="para">Rincian panjang lintasan menurut moda: ${esc(M.modes.map((m) => `${m.drone ? "penerbangan drone" : m.mode} ±${num(m.km, 2)} km`).join("; "))}. Total pada tabel merupakan penjumlahan angka harian yang telah dibulatkan.</p>` : "";
    body.push(h2("B. PELAKSANAAN KEGIATAN"), h3("1. Keadaan Lokasi"), noteBlock(notes, "lokasi"),
      h3("2. Waktu Pelaksanaan"), noteBlock(notes, "waktu"),
      `<p class="cap">Tabel 1 Rekap Sesi Perekaman Data SMART</p>`,
      `<table class="data"><thead><tr><th>Hari</th><th>Tanggal</th><th>Sesi Perekaman SMART</th><th>Moda</th><th>Jarak (km)</th><th>Catatan Temuan</th></tr></thead><tbody>${M.days.map((d) => `<tr><td class="c">${d.no}</td><td class="nw">${esc(nb(tglPanjang(d.date, true)))}</td><td class="c">${d.start}–${d.end}</td><td class="c">${esc(d.drone ? "Drone" : d.transport || "-")}</td><td class="r">${num(d.km, 2)}</td><td class="r">${d.nObs}</td></tr>`).join("")}<tr class="total"><td></td><td colspan="3">Total</td><td class="r">${num(t.km, 2)}</td><td class="r">${t.obs}</td></tr></tbody></table>`, modesRow,
      h3("3. Alat dan Bahan"), `<p class="para">Alat dan bahan yang digunakan dalam kegiatan ini adalah sebagai berikut:</p>`, `<p class="cap">Tabel 2 Alat dan Bahan</p>`, alatTable(I.alat),
      h3("4. Metode"), `<p class="sub">a. Metode Pelaksanaan</p>`,
      `<p class="para">Kegiatan dilaksanakan berdasarkan Keputusan Direktur Jenderal Konservasi Sumber Daya Alam dan Ekosistem Nomor 74 Tahun 2025 tentang Panduan Patroli Berbasis Spatial Monitoring and Reporting Tool (SMART), dengan tahapan sebagai berikut:</p>`, noteBlock(notes, "metode"),
      `<p class="sub">b. Metode Analisis Data</p>`, noteBlock(notes, "analisis"),
      h3("5. Tim Pelaksana"), `<p class="para">${esc(teamSentence(M.members))} Susunan tim disajikan pada tabel berikut:</p>`,
      `<p class="cap">Tabel 3 Tim Pelaksana Kegiatan</p>`, teamTable(M.members, (m) => (m.isLeader ? "Ketua Tim" : "")),
      h3("6. Anggaran dan Tata Waktu"),
      `<p class="para">Kegiatan ini dibiayai dari ${esc(I.sumberAnggaran)}${I.nomorDipa ? ` (DIPA Nomor ${esc(I.nomorDipa)})` : ""} dengan jumlah ${esc(I.anggaran || "Rp……………")}, dengan rincian sebagai berikut:</p>`,
      `<p class="cap">Tabel 4 Ringkasan Rincian Anggaran</p>`, rabTable(I.rab, I.total),
      `<p class="para">Tata waktu pelaksanaan kegiatan adalah sebagai berikut:</p>`, `<p class="cap">Tabel 5 Tata Waktu Pelaksanaan</p>`,
      ganttTable([[`Penyusunan Rencana Pelaksanaan Kegiatan ${I.judul}`, addDays(I.mulai, -I.rencanaHari), addDays(I.mulai, -1)], [`Pelaksanaan Kegiatan ${I.judul}`, I.mulai, I.selesai],
        [`Penyusunan Laporan Kegiatan ${I.judul}`, addDays(I.selesai, 1), I.tanggalLaporan < I.selesai ? I.selesai : I.tanggalLaporan]].filter((r) => r[1] <= r[2])));

    /* C. Hasil dan pembahasan */
    body.push(h2("C. HASIL DAN PEMBAHASAN"), h3("1. Hasil"), noteBlock(notes, "hasil"), `<div class="blk" data-block="tabel_temuan">`);
    let fig = 0, tab = 5;
    M.groups.forEach((gr, gi) => {
      const C = columnsFor(gr, M);
      body.push(`<p class="sub">${String.fromCharCode(97 + gi)}. ${esc(gr.label)}</p>`, noteBlock(notes, "hasil_" + gr.top));
      const hasilPhotos = gr.items.flatMap((o) => o.photos).filter((ph) => ph.place === "hasil");
      if (hasilPhotos.length) {
        body.push(`<div class="photos">${hasilPhotos.map((ph) => { const o = ph.ob; ph.fig = ++fig; return photoFig(ph, photoUrls.get(ph.file), `Gambar ${fig}. ${esc(o.catLabel)}${o.attrs.find((a) => a.key === "tipetemuan") ? " – " + esc(o.attrs.find((a) => a.key === "tipetemuan").text) : ""}${o.wp.grid ? ` di Grid ${esc(o.wp.grid)}` : ""}${o.wp.zona ? ` (${esc(o.wp.zona)})` : ""}`); }).join("")}</div>`);
      }
      body.push(`<p class="cap">Tabel ${++tab} Catatan ${esc(gr.label)}</p>`, `<table class="data detail"><thead><tr><th>No</th><th>Tanggal/ Jam</th><th>Koordinat X/ Y</th>${C.multi ? "<th>Jenis Temuan</th>" : ""}${C.grid ? "<th>Grid</th>" : ""}${C.zona ? "<th>Zona</th>" : ""}${C.heads.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>
        ${gr.items.map((o, i) => `<tr${o.dup ? ' class="dup"' : ""}><td class="c">${i + 1}${o.dup ? "*" : ""}</td><td class="nw">${esc(nb(tglPanjang(o.wp.date)))}<br>${esc((o.wp.time || "").substr(0, 5))}</td><td class="nw">${xy(o.wp.x)}<br>${xy(o.wp.y)}</td>${C.multi ? `<td>${esc(o.catLabel)}</td>` : ""}${C.grid ? `<td class="c">${esc(o.wp.grid || "-")}</td>` : ""}${C.zona ? `<td>${esc(o.wp.zona || "-")}</td>` : ""}${C.keys.map((k) => { const a = o.attrs.find((x) => x.key === k); return `<td>${a ? (/^jenis(satwa|tumbuhan|biota)/.test(k) ? sci(a.text) : esc(a.text)) : "-"}</td>`; }).join("")}</tr>`).join("")}</tbody></table>`);
      const notesUnder = [];
      if (gr.items.some((o) => o.dup)) notesUnder.push("* Kategori, jenis, tanggal, dan koordinat sama dengan catatan lain; perlu diperiksa apakah pengamatan berbeda atau pencatatan ganda.");
      if (gr.unidentified) notesUnder.push('"Belum ada di daftar aplikasi": jenis belum tersedia dalam daftar jenis aplikasi SMART dan tidak dihitung sebagai jenis tersendiri.');
      if (notesUnder.length) body.push(`<p class="fn">${notesUnder.map(esc).join("<br>")}</p>`);
    });
    body.push(`</div>`, h3("2. Pembahasan"), noteBlock(notes, "pembahasan"));

    /* D. Simpulan dan saran, E. Penutup */
    body.push(h2("D. SIMPULAN DAN SARAN"), h3("1. Simpulan"), noteBlock(notes, "kesimpulan"), h3("2. Saran dan Rekomendasi"), noteBlock(notes, "saran"),
      h2("E. PENUTUP"), noteBlock(notes, "penutup"));
    body.push(`<table class="sign right" data-block="tanda_tangan"><tr><td></td><td>${sign([`${I.kota || "………"}, ${pengesahanTgl}`, "Ketua Tim Pelaksana,"], I.penyusun ? I.penyusun.name : "", I.penyusun ? I.penyusun.nip : "")}</td></tr></table>`);

    /* Lampiran */
    body.push(`<h1 class="pb" id="lampiran">LAMPIRAN</h1><h2 class="lamp">A. Peta Pelaksanaan Kegiatan</h2>`);
    let mi = 0;
    for (const gr of M.groups) {
      const m = maps.perTop && maps.perTop[gr.top];
      if (m) body.push(`<h3>${++mi}. ${esc(gr.label)}</h3><figure class="map"><img src="${m.dataUrl}" alt=""></figure>`);
    }
    if (maps.tracking) body.push(`<h3>${++mi}. Peta Tracking Kegiatan</h3><figure class="map" data-block="peta"><img src="${maps.tracking.dataUrl}" alt=""></figure>`);

    const kegiatan = M.photos.filter((ph) => ph.place === "kegiatan");
    body.push(`<h2 class="lamp pb">B. Dokumentasi Pelaksanaan Kegiatan</h2>`);
    if (kegiatan.length) body.push(`<div class="photos">${kegiatan.map((ph) => photoFig(ph, photoUrls.get(ph.file), `${esc(ph.ob.catLabel)}${ph.ob.attrs.find((a) => a.key === "tipetemuan") ? " – " + esc(ph.ob.attrs.find((a) => a.key === "tipetemuan").text) : ""}`)).join("")}</div>`);
    else body.push(`<p class="para">Belum ada foto dokumentasi kegiatan.</p>`);

    const bio = M.photos.filter((ph) => ph.place === "biodiv");
    body.push(`<h2 class="lamp pb">C. Dokumentasi Keanekaragaman Hayati</h2>`);
    if (bio.length) body.push(`<div class="photos" data-block="foto">${bio.map((ph) => photoFig(ph, photoUrls.get(ph.file), ph.ob.species ? sci(ph.ob.species) : esc(ph.ob.catLabel))).join("")}</div>`);
    else body.push(`<p class="para">Tidak ada foto keanekaragaman hayati.</p>`);

    body.push(`<h2 class="lamp pb">D. Surat Tugas</h2>`);
    if ((scans || []).length) body.push(scans.map((u) => `<figure class="scan"><img src="${u}" alt="Surat Tugas"></figure>`).join(""));
    else body.push(`<p class="para placeholder">Unggah scan Surat Tugas (JPG, PNG, atau PDF) di panel kiri untuk verifikasi penugasan.</p>`);

    return { html: `<section class="sec-front">${front.join("\n")}</section>\n<section class="sec-body">${body.join("\n")}</section>`, info: I };
  }

  window.SRGReport = { KEGIATAN, kegiatanOf, kegText, kegTeamCheck, metodeLines, alatFor, judulLengkap, buildModel, renderHTML, autoNotes, deriveInfo, readiness, periode, periodeSd, tglPanjang, num, hhmm, fmtNip, esc, lines, DAY_COLORS, BIODIV,
    sign, noteBlock, terbilang, nTxt, rupiah, rp, numVal, addDays, parseISO, inGeom, BULAN, listText, PH, fixText, sci, nb,
    DEFAULT_DASAR, DEFAULT_METODE, DEFAULT_ALAT, DEFAULT_RAB, DEFAULT_AKUN, UNSUR, UNSUR_GROUPS, guessUnsur, unsurGroup, teamSentence, teamShort, teamTable, alatTable,
    rabRows, rabTable, terbilangRupiah, sumberAnggaran, dasarList, ganttTable, kopHtml, titleHtml, hasPH };
})();
