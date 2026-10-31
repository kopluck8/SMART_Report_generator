/*
 * Model laporan dan HTML Laporan Pelaksanaan Kegiatan (LPK) Balai Taman Nasional Tambora.
 * Susunan mengikuti Memorandum Kepala Balai Nomor M.57/T.41/TU/PEG/02/2026 (Lampiran 3 dan 4):
 * sampul, lembar pengesahan, daftar isi, daftar tabel, lalu kop dan LAPORAN / TENTANG / judul,
 * 1. Pendahuluan, 2. Kegiatan yang dilaksanakan, 3. Hasil yang dicapai, 4. Simpulan dan saran, 5. Penutup,
 * blok penyusun (tempat, tanggal, jabatan, nama, NIP), dan lampiran.
 * Bagian bersama dengan RPK (sampul, pengesahan, tim per unsur dan peran, alat, anggaran, tata waktu, dasar) juga ada di sini.
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
  // Perincian sesuai PUEBI: "A dan B", "A, B, dan C" (aman untuk unsur yang memuat koma)
  const listText = (arr) => { const a = arr.filter((x) => x !== "" && x != null); return a.length < 3 ? a.join(a.length === 2 && a.some((x) => / dan /.test(x)) ? " serta " : " dan ") : `${a.slice(0, -1).join(", ")}, dan ${a[a.length - 1]}`; };
  const PH = (t) => `[${t}]`; // isian yang wajib dilengkapi penyusun
  // Nama ilmiah yang dicetak miring di narasi (ditambah dari profil kawasan dan catatan SMART)
  const LATIN = new Set();

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
  const BINOM = /^[A-Z][a-z]+ (?:[a-z]{3,}|spp?\.?)(?: [a-z]{3,})?$/;
  function sci(name) {
    const s = String(name || "");
    const ital = (t) => esc(t).replace(/[^\s\/]+/g, (w) => (/^spp?\.?$/.test(w) ? w : `<i>${w}</i>`));
    // "Golkar - Kerinyuh - Chromolaena odorata": hanya bagian nama ilmiah (terakhir) yang miring
    const parts = s.split(/\s+-\s+/);
    if (parts.length > 1) {
      const last = parts[parts.length - 1].replace(/^-\s*/, "");
      return BINOM.test(last) ? `${esc(parts.slice(0, -1).join(" - "))} - ${ital(last)}` : `${esc(parts[0])} - ${ital(parts.slice(1).join(" - ").replace(/^-\s*/, ""))}`;
    }
    const w = s.split(" ");
    if (w.length === 2 && /^[A-Z][a-z]{2,}$/.test(w[0]) && /^[a-z]{3,}$/.test(w[1]) && LATIN_END.test(w[1]) && !/^(lainnya|lain|biasa)$/.test(w[1])) return `<i>${esc(s)}</i>`;
    return esc(s);
  }
  // Nama jenis di kalimat: "Cikukua tanduk - Philemon buceroides" menjadi "Cikukua tanduk (Philemon buceroides)"; nama ilmiahnya dicetak miring
  function spName(name) {
    const parts = String(name || "").split(/\s+-\s+/).map((x) => x.replace(/^-\s*/, "").trim()).filter(Boolean);
    const last = parts[parts.length - 1] || "";
    if (!BINOM.test(last)) return parts.join(" - ");
    const spp = /\sspp?\.?$/.test(last);
    if (parts.length > 1 || spp || LATIN_END.test(last.split(" ")[1])) LATIN.add(spp ? last.split(" ")[0] : last);
    return parts.length > 1 ? `${parts.slice(0, -1).join("/")} (${last})` : last;
  }
  // Miringkan nama ilmiah di HTML narasi: "Nama - Genus species", "(Genus species)", dan nama di daftar LATIN
  function italicLatin(html) {
    let s = html.replace(/(\s-\s)([A-Z][a-z]+ [a-z]{3,}(?: [a-z]{3,})?)(?=[\s,.;)]|$)/gm, "$1<i>$2</i>")
      .replace(/\(([A-Z][a-z]{2,} [a-z]{3,})\)/g, (m, n) => (LATIN_END.test(n.split(" ")[1]) && !/^(lainnya|lain|biasa)$/.test(n.split(" ")[1]) ? `(<i>${n}</i>)` : m));
    for (const n of LATIN) if (n) s = s.split(n).join(`<i>${n}</i>`);
    return s.replace(/(?:<i>)+([^<]*)(?:<\/i>)+/g, "<i>$1</i>");
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
    bahas: ["mitra"],
    saran: ["Melanjutkan pembinaan dan pelatihan MMP/MPA/Pokmas, termasuk penggunaan SMART Mobile, agar mitra dapat menyampaikan informasi gangguan kawasan secara mandiri dan cepat."],
    perlu: ["masyarakat"]
  };
  const K_APARAT = {
    konteks: "Gangguan kawasan seperti perambahan, pembalakan liar, perburuan satwa, dan pembakaran lahan dapat melibatkan pelaku yang terorganisasi dan berpotensi menimbulkan konflik di lapangan. Sinergi dengan TNI dan Polri, sebagaimana Nota Kesepahaman Kementerian Kehutanan dengan TNI dan dengan Polri, memperkuat kehadiran aparat di lapangan, meningkatkan efek pencegahan, dan mendukung penegakan hukum apabila ditemukan dugaan tindak pidana kehutanan.",
    metode: [
      "Sebelum pelaksanaan dilakukan koordinasi dan pengarahan bersama unsur TNI/Polri mengenai sasaran, jalur, pembagian tugas, dan prosedur bertindak di lapangan.",
      "Apabila ditemukan dugaan tindak pidana kehutanan, tim mengamankan lokasi dan barang bukti, mendokumentasikan, dan melaporkan kepada pimpinan untuk ditindaklanjuti sesuai kewenangan; tindakan hukum dilakukan oleh penyidik yang berwenang."
    ],
    bahas: ["aparat", "tipihut"],
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
    bahas: ["sosialisasi", "hotspot"],
    saran: ["Meningkatkan frekuensi patroli pencegahan pada puncak musim kemarau di lokasi rawan, serta memastikan kesiapan peralatan pemadaman awal di pos dan kelompok MPA."],
    alat: ALAT_KARHUT, fire: true
  };
  const join = (...ks) => ks.reduce((a, k) => ({ ...a, ...k,
    konteks: [a.konteks, k.konteks].filter(Boolean).join("\n"),
    metode: [...(a.metode || []), ...(k.metode || [])], bahas: [...(a.bahas || []), ...(k.bahas || [])],
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
      bahas: ["rawan", "potensi"],
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
      bahas: ["kamera"]
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
      .replace(/\{mitra\}/g, mas ? `${nTxt(mas)} orang unsur masyarakat (MMP/MPA/Pokmas/masyarakat) ikut dalam tim` : "unsur masyarakat belum tercatat dalam tim")
      .replace(/\{aparat\}/g, apa ? `${nTxt(apa)} orang unsur TNI/Polri ikut dalam tim` : "unsur TNI/Polri belum tercatat dalam tim");
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
  const UNSUR_SHORT = { balai: "petugas Balai", polri: "personel Polri", tni: "personel TNI", mmp: "MMP", mpa: "MPA", masyarakat: "masyarakat" };
  const UNSUR_GROUPS = [
    { keys: ["balai"], label: "Petugas Balai Taman Nasional Tambora", short: "petugas Balai Taman Nasional Tambora", id: "NIP" },
    { keys: ["polri"], label: "Personel Kepolisian Negara Republik Indonesia (Polri)", short: "personel Polri", id: "NRP" },
    { keys: ["tni"], label: "Personel Tentara Nasional Indonesia (TNI)", short: "personel TNI", id: "NRP" },
    { keys: ["mmp", "mpa", "masyarakat"], label: "Unsur Masyarakat (MMP, MPA, dan Masyarakat)", short: "orang dari unsur masyarakat (MMP/MPA/masyarakat)", id: "NIK" }
  ];
  const MASYARAKAT = ["mmp", "mpa", "masyarakat"], APARAT = ["tni", "polri"];
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
  // Ringkas untuk halaman pengesahan: "8 orang (5 petugas Balai TN Tambora, 1 Polri, 1 TNI, 1 masyarakat)"
  function teamShort(members) {
    const SH = ["petugas Balai TN Tambora", "Polri", "TNI", "masyarakat"];
    const parts = UNSUR_GROUPS.map((g, i) => ({ i, n: members.filter((m) => unsurGroup(m.unsur) === i).length })).filter((x) => x.n);
    return `${members.length} orang${parts.length > 1 ? ` (${parts.map((x) => `${x.n} ${SH[x.i]}`).join(", ")})` : parts.length ? ` ${SH[parts[0].i]}` : ""}`;
  }
  // Ringkas per unsur: "2 orang MMP dan 1 orang MPA"
  const unsurCount = (ms) => listText([...new Set(ms.map((m) => m.unsur))].map((u) => `${ms.filter((m) => m.unsur === u).length} orang ${UNSUR_SHORT[u] || u}`));

  /* ---------- Peran dalam tim (Memorandum: susunan tim dan peran masing-masing) ---------- */
  const PERAN = [
    { k: "Ketua Tim", tugas: "memimpin dan mengoordinasikan pelaksanaan kegiatan, menjaga keselamatan tim, dan bertanggung jawab atas laporan" },
    { k: "Wakil Ketua Tim", tugas: "membantu ketua tim dan menggantikan tugasnya bila berhalangan" },
    { k: "Pencatat Data SMART", tugas: "merekam jalur dan temuan menggunakan aplikasi SMART Mobile" },
    { k: "Navigator", tugas: "menentukan arah dan jalur patroli menggunakan GPS dan peta kerja" },
    { k: "Dokumentasi", tugas: "mendokumentasikan pelaksanaan kegiatan dan temuan" },
    { k: "Anggota", tugas: "melaksanakan penyisiran, pengamatan, dan pendataan temuan" },
    { k: "Pengamanan", tugas: "mendukung pengamanan tim dan penanganan dugaan tindak pidana kehutanan" },
    { k: "Pemandu Lapangan", tugas: "menunjukkan jalur serta memberikan informasi kondisi lapangan dan gangguan kawasan" },
    { k: "Regu Pemadam", tugas: "melakukan pemadaman awal apabila ditemukan api" },
    { k: "Pengemudi", tugas: "mengemudikan kendaraan operasional" },
    { k: "Operator Drone", tugas: "menerbangkan drone untuk pemantauan dari udara" },
    { k: "Logistik", tugas: "menyiapkan perbekalan dan perlengkapan tim" }
  ];
  // Peran bawaan: ketua dari SMART/koordinator, pilot dari SMART, TNI/Polri pengamanan, masyarakat pemandu (MPA pada judul kebakaran: regu pemadam)
  function defaultPeran(m, ctx = {}) {
    if (m.isLeader || m.koordinator) return "Ketua Tim";
    if (m.isPilot) return ctx.drone ? "Operator Drone" : "Pengemudi";
    if (APARAT.includes(m.unsur)) return "Pengamanan";
    if (m.unsur === "mpa" && ctx.fire) return "Regu Pemadam";
    if (MASYARAKAT.includes(m.unsur)) return "Pemandu Lapangan";
    return "Anggota";
  }
  const peranRank = (p) => { const i = PERAN.findIndex((x) => x.k === p); return i < 0 ? 99 : i; };
  // "Ketua Tim (Nama): tugas;" per peran, berurutan sesuai daftar PERAN
  function peranLines(members, peranOf) {
    const by = new Map();
    members.forEach((m) => { const p = peranOf(m) || "Anggota"; if (!by.has(p)) by.set(p, []); by.get(p).push(m); });
    const rows = [...by.entries()].sort((a, b) => peranRank(a[0]) - peranRank(b[0]));
    return rows.map(([p, ms], i) => `${p} (${ms.length === 1 ? ms[0].name || ms[0].nama : `${nTxt(ms.length)} orang`}): ${(PERAN.find((x) => x.k === p) || { tugas: "melaksanakan tugas sesuai arahan ketua tim" }).tugas}${i === rows.length - 1 ? "." : ";"}`);
  }
  // NIP 18 digit boleh pindah baris setelah tanggal lahir (8 digit pertama) bila kolom sempit; NRP/NIK tidak dipotong
  const nipCell = (id) => { const f = fmtNip(id), m = f.match(/^(\d{8}) (\d{6} \d \d{3})$/); return m ? `${m[1]} ${nb(m[2])}` : nb(f); };
  // Tabel tim per unsur; label nomor identitas mengikuti unsur (NIP/NRP/NIK); kolom peran dalam tim
  function teamTable(members, peranOf) {
    let no = 0, grp = 0;
    const rows = [];
    UNSUR_GROUPS.forEach((g, gi) => {
      const ms = members.filter((m) => unsurGroup(m.unsur) === gi);
      if (!ms.length) return;
      rows.push(`<tr class="grp"><td colspan="6">${String.fromCharCode(65 + grp++)}. ${esc(g.label)} (${ms.length} orang; nomor identitas: ${g.id})</td></tr>`);
      ms.forEach((m) => {
        const id = String(m.nip || "").trim();
        rows.push(`<tr><td class="c">${++no}</td><td>${esc(m.name || m.nama)}</td><td>${id ? esc(nipCell(id)) : "-"}</td><td>${esc(m.pangkat || "-")}</td><td>${esc(m.jabatan || (gi === 3 ? UNSUR[m.unsur] || "Masyarakat" : "-"))}</td><td>${esc((peranOf && peranOf(m)) || "Anggota")}</td></tr>`);
      });
    });
    return `<table class="data team" data-block="tabel_anggota"><thead><tr><th>No</th><th>Nama</th><th>NIP/NRP/NIK</th><th>Pangkat/ Golongan</th><th>Jabatan/ Unsur</th><th>Peran dalam Tim</th></tr></thead><tbody>${rows.join("") || `<tr><td colspan="6" class="c">Belum ada anggota tim.</td></tr>`}</tbody></table>`;
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

  /* ---------- Dasar: diurutkan dari peraturan tertinggi sampai terendah (Memorandum, Lampiran 4) ---------- */
  const DASAR_RANK = [
    [/^Undang-Undang Dasar/i, 0], [/^Undang-Undang\b/i, 1], [/^Peraturan Pemerintah Pengganti/i, 2], [/^Peraturan Pemerintah\b/i, 3],
    [/^Peraturan Presiden/i, 4], [/^Keputusan Presiden|^Instruksi Presiden/i, 5], [/^Peraturan Menteri/i, 6], [/^Keputusan Menteri/i, 7],
    [/^Peraturan Direktur Jenderal|^Peraturan Dirjen/i, 8], [/^Keputusan Direktur Jenderal|^Keputusan Dirjen/i, 9], [/^Surat Edaran/i, 10],
    [/^Nota Kesepahaman|^Perjanjian Kerja Sama|^Memorandum of Understanding/i, 11], [/^(Peraturan|Keputusan) Kepala Balai/i, 12],
    [/^Daftar Isian Pelaksanaan Anggaran|^DIPA\b/i, 14], [/^Surat (Tugas|Perintah)/i, 15]
  ];
  const dasarRank = (s) => { for (const [re, r] of DASAR_RANK) if (re.test(s)) return r; return 13; };
  const dasarYear = (s) => { const m = s.match(/Tahun (\d{4})/i) || s.match(/\/(\d{4})\b/); return m ? Number(m[1]) : 9999; };
  // Urutan tetap stabil untuk aturan dengan tingkat dan tahun yang sama
  const sortDasar = (list) => list.map((s, i) => ({ s, i, r: dasarRank(s), y: dasarYear(s) })).sort((a, b) => a.r - b.r || a.y - b.y || a.i - b.i).map((x) => x.s);
  function dasarList(profile, I, members) {
    const d = lines(profile.dasarHukum || DEFAULT_DASAR).map((x) => x.replace(/^\d+[.)]\s*/, ""));
    // Judul kegiatan kebakaran: tambah peraturan pengendalian karhutla bila belum ada di daftar Profil
    if (((I.keg && I.keg.fire) || isFire(I.judul)) && !d.some((x) => /P\.32\/MENLHK/i.test(x))) d.push(PERMEN_KARHUTLA);
    if (members.some((m) => m.unsur === "tni")) d.push(MOU_TNI);
    if (members.some((m) => m.unsur === "polri")) d.push(MOU_POLRI);
    if (I.nomorDipa) d.push(`Daftar Isian Pelaksanaan Anggaran (DIPA) ${profile.balai || "Balai Taman Nasional Tambora"} Tahun Anggaran ${I.year} Nomor ${I.nomorDipa}${I.tanggalDipa ? ` tanggal ${tglPanjang(I.tanggalDipa)}` : ""};`);
    d.push(`Surat Tugas Kepala ${profile.balai || "Balai Taman Nasional Tambora"} Nomor ${I.nomorST || "……………"}${I.tanggalST ? ` tanggal ${tglPanjang(I.tanggalST)}` : ""}.`);
    // Tanda baca akhir disesuaikan setelah diurutkan: titik koma, kecuali butir terakhir
    return sortDasar(d).map((x, i, a) => x.replace(/[;.]\s*$/, "") + (i === a.length - 1 ? "." : ";"));
  }
  // Tata waktu: kolom per hari bila rentangnya paling lama 16 hari; lebih dari itu kolom per minggu (I-V tiap bulan) agar tetap terbaca pada huruf 11 pt
  const ROMAWI = ["I", "II", "III", "IV", "V"];
  function ganttTable(rows) {
    const g0 = rows.reduce((a, r) => (r[1] < a ? r[1] : a), rows[0][1]), g1 = rows.reduce((a, r) => (r[2] > a ? r[2] : a), rows[0][2]);
    const gdays = [];
    for (let d = g0; d <= g1 && gdays.length < 370; d = addDays(d, 1)) gdays.push(d);
    const weekly = gdays.length > 16, cols = [];
    gdays.forEach((d) => {
      const dt = parseISO(d), m = dt.getUTCMonth(), y = dt.getUTCFullYear(), w = Math.min(5, Math.ceil(dt.getUTCDate() / 7));
      const key = weekly ? `${y}-${m}-${w}` : d, last = cols[cols.length - 1];
      if (last && last.key === key) last.days.push(d);
      else cols.push({ key, m, y, label: weekly ? ROMAWI[w - 1] : String(dt.getUTCDate()), days: [d] });
    });
    const months = [];
    cols.forEach((c) => { const last = months[months.length - 1]; if (last && last.m === c.m && last.y === c.y) last.n++; else months.push({ m: c.m, y: c.y, n: 1 }); });
    const yrs = months.some((x) => x.y !== months[0].y);
    return `<table class="data gantt${weekly ? " weekly" : ""}"><thead><tr><th rowspan="2">No</th><th rowspan="2">Tahapan Kegiatan</th>${months.map((x) => `<th colspan="${x.n}">${BULAN[x.m]}${yrs ? " " + x.y : ""}</th>`).join("")}</tr><tr>${cols.map((c) => `<th class="d">${c.label}</th>`).join("")}</tr></thead><tbody>${rows.map((r, i) => `<tr><td class="c">${i + 1}.</td><td>${esc(r[0])}</td>${cols.map((c) => `<td class="${c.days.some((d) => d >= r[1] && d <= r[2]) ? "on" : ""}"></td>`).join("")}</tr>`).join("")}</tbody></table>${weekly ? `<p class="fn">Angka romawi pada kolom menunjukkan minggu ke-I sampai ke-V setiap bulan.</p>` : ""}`;
  }

  /* ---------- Halaman awal bersama LPK dan RPK ---------- */
  const DEFAULT_ALAMAT = "Jl. Syech Muhammad No. 5 Dompu 84212";
  const DEFAULT_KONTAK = "Telp. 0370-21919 Fax. 0370-21919, e-mail : tntambora@gmail.com";
  // Kop surat sesuai Memorandum: instansi, nama Balai, alamat, dan kontak
  function kopHtml(profile) {
    const P = typeof profile === "string" ? { balai: profile } : profile || {};
    const balai = P.balai || "Balai Taman Nasional Tambora", alamat = P.alamat ?? DEFAULT_ALAMAT, kontak = P.kontak ?? DEFAULT_KONTAK;
    return `<div class="kop">${window.SRG_KOP_LOGO ? `<img src="${window.SRG_KOP_LOGO}" alt="">` : ""}<div class="kop-t"><div>KEMENTERIAN KEHUTANAN</div><div>DIREKTORAT JENDERAL KONSERVASI SUMBER DAYA ALAM DAN EKOSISTEM</div><div class="big">${esc(balai.toUpperCase())}</div>${alamat ? `<div class="addr">${esc(alamat)}</div>` : ""}${kontak ? `<div class="addr">${esc(kontak)}</div>` : ""}</div></div>`;
  }
  // LAPORAN (tebal), baris kosong, TENTANG, JUDUL KEGIATAN (tebal)
  function titleHtml(jenis, judul) {
    return `<div class="doc-title"><p class="b">${esc(jenis)}</p><p class="gap">&nbsp;</p><p>TENTANG</p><p class="b">${esc(judul.toUpperCase())}</p></div>`;
  }
  // Sampul seperti versi sebelumnya: judul, logo Balai, tim pelaksana, nomor ST dan waktu, tempat dan bulan
  function coverHtml(o) {
    return `<div class="cover"><p class="cv-title">${esc(o.jenis)}<br>${esc(o.judul.toUpperCase())}<br>${esc(o.balai.toUpperCase())}</p>
      ${o.logo ? `<img class="cv-logo" src="${o.logo}" alt="">` : `<div class="cv-logo nologo">Logo Balai<br>(atur di Profil Balai)</div>`}
      <p class="cv-by">OLEH:<br>TIM PELAKSANA KEGIATAN</p>
      <p class="cv-st">${esc(o.nomorST || "ST. ……………")}<br>${esc(String(o.periode || "").toUpperCase())}</p>
      <p class="cv-place">${esc((o.kota || "………").toUpperCase())}, ${esc(String(o.bulanTahun || "").toUpperCase())}</p></div>`;
  }
  const bulanTahun = (iso) => (iso ? `${BULAN[parseISO(iso).getUTCMonth()]} ${iso.substr(0, 4)}` : "");
  // Blok tanda tangan; nama tidak ditebalkan (Memorandum, Lampiran 3 dan 4)
  function sign(lines, name, nip, cls = "") {
    return `<div class="sg${cls ? " " + cls : ""}">${lines.map((l) => `<div>${esc(l) || "&nbsp;"}</div>`).join("")}<div class="space"></div><div class="nm">${esc(name || "……………………………")}</div><div>NIP. ${esc(fmtNip(nip) || "……………………")}</div></div>`;
  }
  const kvTable = (kv) => `<table class="kv-plain">${kv.map(([k, v]) => `<tr><td>${esc(k)}</td><td>:</td><td>${esc(v)}</td></tr>`).join("")}</table>`;
  // Lembar pengesahan: kop, LEMBAR PENGESAHAN, identitas kegiatan, lalu tanda tangan kiri, kanan, dan bawah tengah
  function pengesahanHtml(profile, kv, s) {
    return `${kopHtml(profile)}<h1 class="front" id="pengesahan">LEMBAR PENGESAHAN</h1>${kvTable(kv)}
      <table class="sign memo"><tr><td>${sign([s.left.head, s.left.jab], s.left.nama, s.left.nip, "memo")}</td><td>${sign([s.right.head || "", s.right.jab], s.right.nama, s.right.nip, "memo")}</td></tr>
      <tr><td colspan="2">${sign([s.bottom.head, s.bottom.jab], s.bottom.nama, s.bottom.nip, "memo")}</td></tr></table>`;
  }
  // Daftar isi dan daftar tabel. Di Word keduanya berupa field yang diperbarui otomatis saat dokumen dibuka (lengkap dengan nomor halaman).
  function tocHtml(toc, tables) {
    return `<h1 class="front pb">DAFTAR ISI</h1><div class="toc" data-toc="isi">${toc.map((e) => `<div class="toc-${e.lv}">${esc(e.text)}</div>`).join("")}</div>
      <p class="toc-note noprint">Nomor halaman daftar isi dan daftar tabel terisi otomatis di file Word (pilih Ya saat Word menawarkan pembaruan field).</p>
      <h1 class="front pb">DAFTAR TABEL</h1><div class="toc" data-toc="tabel">${tables.map((t) => `<div class="toc-1">${esc(t)}</div>`).join("")}</div>`;
  }
  // Blok penutup: Dibuat di / Pada tanggal / jabatan pembuat laporan / nama / NIP
  function closingHtml(tempat, tanggal, jabatan, nama, nip) {
    return `<table class="sign close" data-block="tanda_tangan"><tr><td></td><td>${sign([`Dibuat di ${tempat || "………"}`, `Pada tanggal ${tanggal}`, jabatan], nama, nip, "close")}</td></tr></table>`;
  }
  // Penomoran judul bagian dan tabel; daftar isi (judul tingkat 1-2) dan daftar tabel dikumpulkan sambil menyusun isi
  function numbering() {
    const toc = [], tables = [];
    let tab = 0;
    return {
      toc, tables,
      h1(text, cls = "sec", pb = false) { toc.push({ lv: 1, text }); return `<h1 class="${cls}${pb ? " pb" : ""}">${esc(text)}</h1>`; },
      h2(text, cls = "", pb = false) { toc.push({ lv: 2, text }); return `<h2 class="${(cls + (pb ? " pb" : "")).trim()}">${esc(text)}</h2>`; },
      h3: (text) => `<h3>${esc(text)}</h3>`,
      cap(text) { tab++; tables.push(`Tabel ${tab} ${text}`); return `<p class="cap" data-seq="Tabel" data-n="${tab}">Tabel ${tab} ${esc(text)}</p>`; },
      next: () => tab + 1
    };
  }
  const para = (html, lv = 2) => `<p class="para lv${lv}">${html}</p>`;
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
  const WIL = () => window.SRGWilayah;
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
        inDirectory: !!dir, manualOk: !!(man.nama && man.jabatan), rank: dir ? dir.rank : 1e6 + members.length, fromSmart: true, key: "s:" + k
      };
      mem.unsur = dir ? "balai" : man.unsur || guessUnsur(mem) || "";
      mem.unsurOk = !!(dir || man.unsur);
      members.push(mem);
    }));
    // Anggota yang ikut tetapi tidak tercatat di SMART (mis. TNI/Polri, MMP/MPA), dari daftar pegawai atau isian manual
    (settings.extraMembers || []).forEach((x, i) => {
      if (!(x.nama || "").trim()) return;
      const id = String(x.nip || "").replace(/\D/g, ""), dir = directory.get(id);
      members.push({ name: (dir && dir.nama) || x.nama, nip: x.nip || "", jabatan: (dir && dir.jabatan) || x.jabatan || "", pangkat: (dir && dir.pangkat) || x.pangkat || "",
        unsur: dir ? "balai" : x.unsur || guessUnsur(x) || "masyarakat", unsurOk: true, inDirectory: !!dir, manualOk: true, rank: dir ? dir.rank : 2e6 + i, extra: true, smartName: x.nama,
        key: "x:" + (x.nip || x.nama) });
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
        // Resor mengikuti batas resor 2026 (Satu Data Tambora); lapisan resor peta dipakai bila batas 2026 tidak tersedia
        const r26 = WIL() ? WIL().resorAt(w.x, w.y) : null;
        w.resort = r26 ? r26.nama : resortLayer ? layerValue(resortLayer, w.x, w.y).replace(/^resor[t]?\s+/i, "") : "";
        const obsList = w.observations.length ? w.observations : [{ category: "", attributes: [], photos: [] }];
        obsList.forEach((o) => {
          const top = (o.category || "").split(".")[0];
          const attrs = o.attributes.map((a) => {
            const vals = a.values.map((v) => (v.kind === "item" ? L.item(v.value, a.key) : v.kind === "number" ? fmtNum(v.value) : v.kind === "bool" ? (v.value ? "Ya" : "Tidak") : v.value));
            return { key: a.key, label: L.attr(a.key), raw: a.values, vals, free: a.values.every((v) => v.kind === "text"), text: vals.join(", ") };
          }).filter((a) => a.text !== "");
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
      for (const o of items) { let s = subs.find((x) => x.key === o.category); if (!s) subs.push((s = { key: o.category, label: o.catLabel, n: 0, items: [] })); s.n++; s.items.push(o); }
      const species = new Map();
      for (const o of items.filter((x) => x.species && !x.unidentified)) {
        const k = o.speciesKey || o.species;
        if (!species.has(k)) species.set(k, { name: o.species, records: 0, total: 0, unit: o.unit, items: [] });
        const s = species.get(k); s.records++; s.items.push(o); if (o.count != null) s.total += o.count;
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
    // Wilayah kerja otomatis dari titik dan jalur patroli (batas resor 2026)
    const track = dayLines.flatMap((l) => l.coords), step = Math.max(1, Math.ceil(track.length / 2000));
    const pts = [...waypoints.map((w) => [w.x, w.y]), ...track.filter((_, i) => i % step === 0).map((c) => [c[0], c[1]])];
    return {
      patrol, members, leader, days, observations, waypoints, groups, photos, dayLines, color, tops, duplicates,
      modes: [...modes.entries()].map(([mode, km]) => ({ mode, km: Math.round(km * 100) / 100, drone: isDrone(mode) })),
      grids: uniq(waypoints.map((w) => w.grid)).sort(sortNum), zonas: uniq(waypoints.map((w) => w.zona)), resorts: uniq(waypoints.map((w) => w.resort)),
      hasLayers: { grid: !!gridLayer, zonasi: !!zonaLayer, resort: !!resortLayer || !!WIL() },
      wilayahAuto: WIL() ? WIL().detect(pts) : null,
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
  // "... di Kawasan TN Tambora" menjadi "... di Wilayah Kerja X, Kawasan TN Tambora" agar kata "di" tidak ganda
  const judulLengkap = (judul, lokasi) => {
    if (!lokasi) return judul;
    const m = judul.match(/^(.*?)\s+di\s+(Kawasan .*)$/i);
    return m ? `${m[1]} di Wilayah Kerja ${lokasi}, ${m[2]}` : `${judul} di Wilayah Kerja ${lokasi}`;
  };
  // Pilihan wilayah: isian form, isian lokasi lama (teks), tebakan dari titik patroli/grid, lalu nama stasiun SMART
  function pickWilayah(chosen, oldText, auto, station) {
    const w = WIL();
    if (!w) return { W: null, auto: false };
    const v = chosen || w.fromText(oldText) || (auto ? auto.v : "") || w.fromText(station);
    return { W: w.resolve(v), auto: !chosen };
  }
  function deriveInfo(M, info, profile) {
    const p = M.patrol;
    const mulai = info.tglMulai || p.startDate, selesai = info.tglSelesai && info.tglSelesai >= mulai ? info.tglSelesai : (info.tglMulai && info.tglMulai > p.endDate ? info.tglMulai : p.endDate);
    const year = (mulai || "").substr(0, 4);
    const dipa = (window.SRG_DIPA || {})[year] || {};
    const looksST = /^ST\.|\/T\.\d+\//i.test(p.id || "");
    const judul = info.judul || p.mandate || "SMART Patrol";
    const wil = pickWilayah(info.wilayah, info.lokasi, M.wilayahAuto, p.station);
    const lokasi = wil.W ? wil.W.lokasi : info.lokasi || p.station || "";
    const grids = info.grids || (M.grids.length ? M.grids.join(", ") : "");
    const penyusun = (info.penyusunNip && M.members.find((m) => m.employeeId && String(m.employeeId) === String(info.penyusunNip))) || M.leader || M.members[0];
    const akun = (info.akun || DEFAULT_AKUN).trim();
    const rab = rabRows(info.rab || []), total = rab.reduce((s, r) => s + r.total, 0);
    const keg = kegiatanOf(judul), fire = isFire(judul) || !!(keg || {}).fire || M.observations.some((o) => o.fire);
    const peranMap = info.peran || {}, ctx = { fire, drone: M.days.some((d) => d.drone) };
    return {
      judul, lokasi, judulLengkap: judulLengkap(judul, lokasi), grids, W: wil.W, wilayahAuto: wil.auto, share: M.wilayahAuto ? M.wilayahAuto.counts : [],
      gridText: grids ? `Grid ${listText(String(grids).split(/[,;]\s*/).map((x) => x.trim()).filter(Boolean))}` : "",
      resort: info.resort || M.resorts.join(", "), akun, rab, total,
      sumberAnggaran: sumberAnggaran(year, akun), anggaran: rupiah(total), tanggalST: info.tanggalST || "", nomorDipa: dipa.nomor || "", tanggalDipa: dipa.tanggal || "",
      nomorST: (info.nomorST || "").trim() || (looksST ? p.id : ""), mulai, selesai, hari: Math.round((parseISO(selesai) - parseISO(mulai)) / 864e5) + 1,
      tanggalLaporan: info.tanggalLaporan || addDays(selesai, 3), kota: info.tempatTtd || profile.kota || "", penyusun, ketua: M.leader || penyusun,
      rencanaHari: Math.max(0, Number(info.rencanaHari ?? 1)), year, alat: info.alat || alatFor(keg), metodeText: profile.metode, keg, fire,
      facts: info.facts || {}, peranOf: (m) => peranMap[m.key] || defaultPeran(m, ctx)
    };
  }

  /* ---------- Isian lapangan: pilihan pengganti narasi bebas ----------
   * Petugas cukup memilih; jawaban dipakai langsung di kalimat pembahasan, simpulan, dan saran.
   * type: pilih (satu pilihan), multi (beberapa pilihan), angka, tanggal, kamera (tabel kamera jebak).
   * show(ctx): tampil bila relevan dengan data patroli dan judul; req(ctx): wajib diisi. */
  const NONE_KENDALA = "tidak ada kendala berarti";
  const FAKTA = [
    { k: "cuaca", label: "Cuaca selama kegiatan", type: "pilih",
      opts: ["cerah", "cerah berawan", "berawan", "berubah-ubah (cerah dan hujan)", "hujan ringan", "hujan lebat", "berkabut", "berangin kencang"] },
    { k: "kendala", label: "Kendala di lapangan", type: "multi",
      opts: [NONE_KENDALA, "medan yang terjal dan licin", "akses jalan yang rusak", "hujan yang menghambat pergerakan tim", "kabut tebal yang membatasi jarak pandang",
        "sinyal GPS yang lemah di bawah tajuk rapat", "daya baterai perangkat yang terbatas", "gangguan pada aplikasi SMART Mobile", "jarak tempuh ke lokasi yang jauh"] },
    { k: "pelakuAM", label: "Pelaku aktivitas manusia", type: "pilih", show: (c) => c.amx,
      opts: ["tidak dijumpai di lokasi", "dijumpai dan diberi imbauan", "dijumpai, diberi imbauan, dan didata identitasnya", "dijumpai dan diserahkan kepada pihak berwenang untuk diproses lebih lanjut"] },
    { k: "tindakanAM", label: "Tindakan tim terhadap aktivitas manusia (SMART tidak mencatat tindakan)", type: "multi", show: (c) => c.amx && !c.amTindakan,
      opts: ["dokumentasi dan pencatatan koordinat temuan", "imbauan atau teguran lisan kepada pelaku", "pemasangan tanda larangan", "pemusnahan sarana pelanggaran (jerat, gubuk, atau alat)",
        "pengamanan barang bukti", "pelaporan kepada pimpinan untuk ditindaklanjuti"] },
    { k: "apiKondisi", label: "Kondisi terakhir api saat tim meninggalkan lokasi", type: "pilih", show: (c) => c.apiAktif, req: (c) => c.apiAktif,
      opts: ["padam total", "padam, masih berasap", "dilokalisasi, belum padam sepenuhnya", "masih menyala dan dilaporkan untuk penanganan lanjutan"] },
    { k: "apiAlat", label: "Alat pemadaman yang digunakan", type: "multi", show: (c) => c.apiAktif,
      opts: ["pompa punggung (jet shooter)", "pemukul api (gepyok)", "garu atau cangkul", "ranting dan dahan", "air dari jeriken"] },
    { k: "apiKendala", label: "Kendala pemadaman", type: "multi", show: (c) => c.apiAktif,
      opts: ["angin kencang", "sumber air jauh", "medan terjal", "bahan bakar kering melimpah", "personel terbatas", "peralatan terbatas"] },
    { k: "apiLuas", label: "Perkiraan luas terbakar (ha)", type: "angka", show: (c) => c.fireRec },
    { k: "apiUkur", label: "Cara mengukur luas terbakar", type: "pilih", show: (c) => c.fireRec,
      opts: ["tracking keliling GPS", "digitasi citra satelit", "estimasi visual"] },
    { k: "apiSumber", label: "Dugaan sumber api", type: "pilih", show: (c) => c.fireRec,
      opts: ["pembukaan lahan dengan api", "perburuan (pembakaran untuk menumbuhkan tunas rumput pemikat rusa)", "pengambilan madu dengan pengasapan", "penggembalaan ternak",
        "api yang ditinggalkan (puntung rokok atau api unggun)", "rambatan dari luar kawasan", "belum diketahui"] },
    { k: "apiDasar", label: "Dasar penentuan sumber api", type: "pilih", show: (c) => c.fireRec && !!c.f.apiSumber && c.f.apiSumber !== "belum diketahui",
      opts: ["pengamatan langsung tim", "keterangan masyarakat atau pihak lain", "tanda-tanda yang ditemukan di lapangan"] },
    { k: "rawanFaktor", label: "Faktor kerawanan kebakaran yang diamati", type: "multi", show: (c) => c.keg === "identifikasi" || c.cegah || c.fireRec,
      opts: ["serasah dan rumput kering melimpah", "dekat jalan atau jalur aktivitas masyarakat", "dekat lahan garapan atau permukiman", "bekas terbakar tahun sebelumnya",
        "lokasi penggembalaan ternak", "jauh dari sumber air"] },
    { k: "sosJumlah", label: "Jumlah masyarakat yang menerima imbauan (orang)", type: "angka", show: (c) => c.cegah },
    { k: "sosDesa", label: "Desa asal masyarakat yang menerima imbauan", type: "multi", show: (c) => c.cegah && c.desa.length > 0, opts: (c) => c.desa },
    { k: "sosMateri", label: "Materi imbauan", type: "multi", show: (c) => c.cegah,
      opts: ["larangan membakar hutan dan lahan", "bahaya api yang ditinggalkan", "pembukaan lahan tanpa bakar", "pelaporan kejadian kebakaran", "larangan perburuan dan penebangan liar"] },
    { k: "hotspot", label: "Pemeriksaan titik panas (hotspot)", type: "pilih", show: (c) => c.cegah,
      opts: ["tidak ada informasi titik panas selama kegiatan", "titik panas telah diperiksa dan tidak ditemukan api", "titik panas telah diperiksa, ditemukan api, dan ditangani"] },
    { k: "hotspotN", label: "Jumlah titik panas yang diperiksa", type: "angka", show: (c) => c.cegah && /diperiksa/.test(c.f.hotspot || "") },
    { k: "mitraPeran", label: "Peran unsur masyarakat dalam tim", type: "multi", show: (c) => c.mitra,
      opts: ["menunjukkan jalur dan lokasi rawan", "memberikan informasi gangguan kawasan", "membantu pencatatan temuan", "membantu pemadaman awal", "menyampaikan imbauan kepada warga"] },
    { k: "aparatPeran", label: "Peran personel TNI/Polri", type: "multi", show: (c) => c.aparat,
      opts: ["pengamanan tim di lapangan", "penyampaian imbauan dan penyuluhan hukum", "pengumpulan bahan keterangan", "pengamanan barang bukti", "koordinasi dengan Koramil dan Polsek setempat"] },
    { k: "tipihut", label: "Dugaan tindak pidana kehutanan", type: "pilih", show: (c) => c.aparat || c.kegAparat,
      opts: ["tidak ditemukan", "ditemukan dan telah dilaporkan kepada pimpinan", "ditemukan dan telah diserahkan kepada penyidik"] },
    { k: "kamera", label: "Kamera jebak yang dipasang atau diunduh", type: "kamera", show: (c) => c.kamera, req: (c) => c.kamera },
    { k: "kameraManusia", label: "Rekaman aktivitas manusia pada kamera jebak", type: "pilih", show: (c) => c.kamera,
      opts: ["tidak ada", "ada dan telah dilaporkan kepada pimpinan"] },
    { k: "kameraJadwal", label: "Rencana pengecekan kamera berikutnya", type: "tanggal", show: (c) => c.kamera },
    { k: "tindakLanjut", label: "Waktu tindak lanjut lokasi prioritas", type: "pilih",
      opts: ["pada patroli rutin berikutnya", "dalam 1 (satu) minggu", "dalam 1 (satu) bulan", "pada awal musim kemarau berikutnya"] }
  ];
  const KAMERA_KONDISI = ["baik", "baterai lemah", "kartu memori penuh", "rusak", "hilang", "dipindahkan"];
  const KAMERA_COLS = [
    { k: "kode", label: "Kode kamera", w: "70px" }, { k: "pasang", label: "Tgl pasang", type: "date", w: "118px" }, { k: "unduh", label: "Tgl unduh", type: "date", w: "118px" },
    { k: "foto", label: "Foto/video", type: "number", w: "60px" }, { k: "satwa", label: "Satwa terekam", list: "satwaList" }, { k: "kondisi", label: "Kondisi", type: "select", opts: KAMERA_KONDISI, w: "96px" }
  ];
  const attrOf = (o, k) => o.attrs.find((a) => a.key === k);
  const attrIs = (o, k, re) => { const a = attrOf(o, k); return !!a && (a.raw.some((v) => re.test(String(v.value))) || re.test(a.text)); };
  // Konteks isian: data patroli dan judul menentukan isian mana yang ditanyakan
  function faktaCtx(M, I) {
    const am = M.groups.find((x) => x.top === "aktivitasmanusia");
    const amx = am ? am.items.filter((o) => !o.fire) : [], fires = M.observations.filter((o) => o.fire);
    const id = I.keg ? I.keg.id : "";
    return {
      f: I.facts || {}, amx: amx.length > 0, amTindakan: amx.some((o) => attrOf(o, "tindakan")), fireRec: fires.length > 0,
      apiAktif: fires.some((o) => attrIs(o, "tipetemuan", /masih ?terbakar|api ?aktif/i) || /apiaktif|titikapi/i.test(o.category)),
      keg: id, cegah: /^cegah/.test(id), kamera: id === "kamera", kegAparat: /aparat/.test(id),
      mitra: M.members.some((m) => MASYARAKAT.includes(m.unsur)), aparat: M.members.some((m) => APARAT.includes(m.unsur)),
      desa: WIL() ? WIL().desaOf(I.W) : []
    };
  }
  const faktaShown = (ctx) => FAKTA.filter((x) => !x.show || x.show(ctx));
  const faktaOpts = (x, ctx) => (typeof x.opts === "function" ? x.opts(ctx) : x.opts || []);
  const kameraRows = (f) => (f.kamera || []).filter((r) => String(r.kode || "").trim());
  const filled = (x, v) => (x.type === "multi" ? Array.isArray(v) && v.length > 0 : x.type === "kamera" ? (v || []).some((r) => String(r.kode || "").trim()) : v != null && String(v).trim() !== "");
  const hariAktif = (r) => (r.pasang && r.unduh && r.unduh >= r.pasang ? Math.round((parseISO(r.unduh) - parseISO(r.pasang)) / 864e5) : null);

  /* ---------- Bantuan narasi ---------- */
  const cap1 = (s) => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);
  const jam = (s) => String(s || "").replace(":", ".");
  // Nilai pilihan Data Model ditulis huruf kecil di tengah kalimat; singkatan (HHBK, SMART, R4) tetap
  const lowerVocab = (s) => String(s || "").replace(/\b([A-Z])([a-z]+)\b/g, (m, a, b) => a.toLowerCase() + b)
    .replace(/\s*\/\s*/g, "/").replace(/(\d+)\s*-\s*(\d+)\s*mdpl/gi, (m, a, b) => `${num(a)}–${num(b)} mdpl`);
  // Jumlah catatan per nilai atribut, terbanyak dulu
  function tally(items, key) {
    const m = new Map();
    items.forEach((o) => { const a = attrOf(o, key); (a ? a.vals : []).forEach((v) => { if (String(v).trim()) m.set(v, (m.get(v) || 0) + 1); }); });
    return [...m.entries()].map(([v, n]) => ({ v, n })).sort((a, b) => b.n - a.n);
  }
  const tallyText = (t, unit = "") => listText(t.map((x) => `${lowerVocab(x.v)} (${x.n}${unit ? " " + unit : ""})`));
  const subsOf = (items) => { const m = new Map(); items.forEach((o) => m.set(o.catLabel, (m.get(o.catLabel) || 0) + 1)); return [...m.entries()].map(([v, n]) => ({ v, n })); };
  // "infrastruktur (2 catatan, yaitu papan larangan dan pos pendakian) dan pal batas (1 catatan, yaitu beton)"
  function ragam(items, groupLabel) {
    const subs = subsOf(items);
    if (subs.length === 1 && lowerVocab(subs[0].v) === lowerVocab(groupLabel)) { const tip = tally(items, "tipetemuan"); return tip.length ? tallyText(tip) : ""; }
    return listText(subs.map((x) => {
      const tip = tally(items.filter((o) => o.catLabel === x.v), "tipetemuan").map((y) => lowerVocab(y.v)).filter((v) => v !== lowerVocab(x.v));
      return `${lowerVocab(x.v)} (${x.n} catatan${tip.length ? `, yaitu ${listText(tip)}` : ""})`;
    }));
  }
  const mostCommon = (arr) => { const m = new Map(); arr.filter(Boolean).forEach((v) => m.set(v, (m.get(v) || 0) + 1)); return [...m.entries()].sort((a, b) => b[1] - a[1]).map((x) => x[0])[0] || ""; };
  const uniqGrids = (items) => [...new Set(items.map((o) => o.wp.grid).filter(Boolean))].sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
  // Jumlah objek per satuan: ["25 batang", "3 ekor"]
  function sumByUnit(items) {
    const m = new Map();
    items.forEach((o) => { if (o.count == null) return; const u = (o.unit || "objek").toLowerCase(); m.set(u, (m.get(u) || 0) + o.count); });
    return [...m.entries()].map(([u, n]) => `${fmtNum(n)} ${u}`);
  }
  const musim = (iso) => { const m = parseISO(iso).getUTCMonth() + 1; return m >= 5 && m <= 10 ? "musim kemarau" : m === 4 || m === 11 ? "masa peralihan musim" : "musim hujan"; };
  const minutes = (t) => { const [h, m, s] = String(t || "0:0:0").split(":").map(Number); return h * 60 + (m || 0) + (s || 0) / 60; };
  // Ringkasan ground check: tipe ekosistem, kelas ketinggian, tutupan lahan
  function gcParts(gc) {
    if (!gc) return [];
    const eko = gc.items.filter((o) => /ekosis|ekosistem/.test(o.category)), tut = gc.items.filter((o) => /tutupan/.test(o.category));
    const out = [];
    const k4 = tally(eko, "klasifikasi4"), k3 = tally(eko, "klasifikasi3");
    if (k4.length) out.push(`tipe ekosistem ${tallyText(k4, "titik")}${k3.length ? ` pada kelas ketinggian ${listText(k3.map((x) => lowerVocab(x.v)))}` : ""}`);
    const k2 = tally(tut, "klasifikasi02"), k1 = k2.length ? k2 : tally(tut, "klasifikasi01");
    if (k1.length) out.push(`tutupan lahan ${tallyText(k1, "titik")}`);
    return out;
  }
  const KAWASAN_LAMA = "Taman Nasional Tambora merupakan kawasan konservasi yang ditetapkan untuk melindungi keunikan ekosistem pascaletusan tahun 1815, melalui Keputusan Menteri Lingkungan Hidup dan Kehutanan Nomor SK.111/Menlhk-II/2015 dengan luas 71.645,64 hektare, dan dikelola oleh Balai Taman Nasional Tambora.";

  /* ---------- Narasi otomatis LPK (tetap bisa diedit di laporan) ---------- */
  function autoNotes(M, I) {
    const t = M.totals, Wl = WIL(), W = I.W, f = I.facts || {}, K = I.keg, C = faktaCtx(M, I);
    const kt = (x) => kegText(x, false, M.members), num1 = (a) => a.map((x, i) => `${i + 1}. ${kt(x)}`);
    const g = (top) => M.groups.find((x) => x.top === top);
    const am = g("aktivitasmanusia"), amx = am ? am.items.filter((o) => !o.fire) : [], fires = M.observations.filter((o) => o.fire);
    const bio = M.groups.filter((x) => BIODIV.includes(x.top)), gc = g("groundcheck"), ft = g("fitur"), sw = g("satwaliar");
    const where = I.gridText ? ` yang difokuskan pada ${I.gridText}` : "";
    const modeTxt = M.modes.map((m) => (m.drone ? `±${num(m.km, 2)} km lintasan penerbangan drone` : `±${num(m.km, 2)} km menggunakan moda ${lowerVocab(m.mode)}`)).join(" dan ") || `±${num(t.km, 2)} km`;
    const zonaTxt = listText(M.zonas.map((z) => "zona " + lowerVocab(z.replace(/^zona\s+/i, ""))));
    const kajian = Wl ? Wl.kajian() : "";
    const pelaksana = W ? W.pelaksana : "petugas resor";
    const kendala = (f.kendala || []).filter((x) => x !== NONE_KENDALA);
    const gp = gcParts(gc);
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
    const ruang = (K && K.ruang ? K.ruang.map(kt) : [
      `Pelacakan dan pendataan indikasi aktivitas manusia${I.fire ? " dan indikasi kebakaran" : ""} di dalam kawasan;`,
      "Pengamatan kondisi tutupan hutan, keberadaan satwa liar dan tumbuhan, serta potensi titik api;",
      "Imbauan kepada masyarakat yang ditemukan beraktivitas di dalam kawasan;",
      "Pencatatan data lapangan menggunakan aplikasi SMART Mobile, termasuk titik koordinat dan dokumentasi visual temuan."
    ]).map((x) => x.replace(/[;.]\s*$/, ";"));
    const daysTxt = M.days.map((d) => `${tglPanjang(d.date)} pukul ${jam(d.start)}–${jam(d.end)}`).join("; ");
    const tahap = [];
    if (I.rencanaHari > 0) tahap.push(`persiapan, berupa penyusunan rencana pelaksanaan kegiatan dan pemeriksaan peralatan, pada ${periodeSd(addDays(I.mulai, -I.rencanaHari), addDays(I.mulai, -1))}`);
    tahap.push(`pelaksanaan patroli dan pengambilan data di lapangan pada ${periodeSd(I.mulai, I.selesai)}`);
    if (I.tanggalLaporan > I.selesai) tahap.push(`pengolahan data dan penyusunan laporan pada ${periodeSd(addDays(I.selesai, 1), I.tanggalLaporan)}`);

    const notes = {
      latar: [
        ...(Wl && Wl.data.kawasan ? Wl.kawasanParas() : [KAWASAN_LAMA]),
        K && K.konteks ? kt(K.konteks) : "",
        Wl && Wl.data.sptn.length ? Wl.wilayahPara(W, false) : `Pengelolaan kawasan dibagi ke dalam beberapa wilayah kerja, salah satunya ${I.lokasi}.`,
        `Oleh karena itu, dilaksanakan kegiatan ${I.judulLengkap} pada tanggal ${periodeSd(I.mulai, I.selesai)}${where}. Dengan metode Spatial Monitoring and Reporting Tool (SMART), setiap temuan di lapangan dapat terdeteksi secara dini, terdokumentasi secara akurat, dan ditindaklanjuti secara cepat.`
      ].filter(Boolean).join("\n"),
      maksud: [
        `Kegiatan ${I.judulLengkap} dimaksudkan sebagai upaya ${K && K.maksud ? K.maksud : `${I.fire ? "pencegahan kebakaran hutan dan lahan serta " : ""}pengamanan dan pemantauan kawasan Taman Nasional Tambora secara terukur dan berbasis data`}${I.gridText ? `, khususnya pada ${I.gridText}` : ""}.`,
        "Adapun tujuan kegiatan ini adalah:", ...tujuan
      ].join("\n"),
      ruanglingkup: [
        "Ruang lingkup kegiatan ini meliputi:",
        `1. Lokasi: wilayah kerja ${W ? (W.type === "resor" ? `${W.nama}, ${W.sptn.nama}` : W.nama) : I.lokasi}, Balai Taman Nasional Tambora${I.gridText ? `, khususnya pada ${I.gridText}` : ""};`,
        `2. Waktu: tanggal ${periodeSd(I.mulai, I.selesai)} sesuai Surat Tugas;`,
        "3. Objek kegiatan:", ...ruang.map((x, i) => `${String.fromCharCode(97 + i)}. ${x}`),
        "4. Batasan: data yang dilaporkan terbatas pada temuan yang direkam tim menggunakan aplikasi SMART Mobile di sepanjang jalur patroli selama periode kegiatan, sehingga tidak menggambarkan kondisi seluruh wilayah kerja."
      ].join("\n"),
      lokasi: [
        W && Wl ? Wl.keadaan(W, I.share, false) : `Lokasi kegiatan berada di wilayah kerja ${I.lokasi}.`,
        [`Jalur patroli ${I.gridText ? `melintasi ${I.gridText}` : "berada di dalam kawasan"}${zonaTxt ? ` pada ${zonaTxt}` : ""}, dengan panjang lintasan yang terekam ${modeTxt}.`,
          gp.length ? `Hasil ground check pada ${gc.coords} titik koordinat menunjukkan ${gp.join(", dengan ")}.` : "",
          f.cuaca ? `Cuaca selama kegiatan umumnya ${f.cuaca}.` : ""].filter(Boolean).join(" ")
      ].join("\n"),
      waktu: [
        `Kegiatan ${I.judulLengkap} dilaksanakan selama ${nTxt(I.hari)} hari, terhitung mulai tanggal ${periodeSd(I.mulai, I.selesai)} sesuai Surat Tugas, termasuk perjalanan menuju lokasi, pelaksanaan patroli, dan kembali ke kantor. Tahapan kegiatan adalah sebagai berikut:`,
        ...tahap.map((x, i) => `${i + 1}. ${cap1(x)}${i === tahap.length - 1 ? "." : ";"}`),
        `Perekaman data SMART dilakukan pada ${nTxt(t.days)} hari, yaitu ${daysTxt}. Jam pada tabel berikut adalah sesi perekaman SMART (awal dan akhir track yang terekam), bukan keseluruhan waktu kerja harian tim.`
      ].join("\n"),
      metode: [
        `Data yang dikumpulkan terdiri atas data primer dan data sekunder. Data primer diperoleh melalui pengamatan langsung di lapangan serta perekaman jalur dan temuan menggunakan aplikasi SMART Mobile, sedangkan data sekunder berupa peta kerja Balai, batas wilayah kerja resor${kajian ? `, dan ${kajian}` : ""}. Lokasi pengamatan ditentukan secara sengaja (purposive sampling) berdasarkan ${K && K.id === "kamera" ? "jalur satwa, sumber air, dan lokasi rawan kebakaran" : "grid sasaran, kerawanan gangguan, dan potensi kawasan"}.`,
        "Kegiatan dilaksanakan berdasarkan Keputusan Direktur Jenderal Konservasi Sumber Daya Alam dan Ekosistem Nomor 74 Tahun 2025 tentang Panduan Patroli Berbasis Spatial Monitoring and Reporting Tool (SMART), dengan tahapan sebagai berikut:",
        ...metodeLines(I.metodeText, K).map((x, i) => `${i + 1}. ${x}`)
      ].join("\n"),
      analisis: [
        "Data hasil patroli diunduh dari SMART Mobile ke SMART Desktop, kemudian diverifikasi meliputi kesesuaian kategori temuan, koordinat, tanggal, foto, dan kemungkinan pencatatan ganda.",
        `Data yang telah diverifikasi dianalisis secara deskriptif kuantitatif: jumlah catatan per kategori, jumlah titik koordinat unik, jumlah jenis yang teridentifikasi, serta sebaran temuan per grid patroli 1 km × 1 km, zona, dan resor melalui tumpang susun (overlay) dengan peta kerja Balai. Panjang lintasan dihitung dari track GPS per hari dan dipisahkan menurut moda${M.modes.some((m) => m.drone) ? " (lintasan darat dan penerbangan drone)" : ""}. Hasil analisis disajikan dalam tabel, peta sebaran, dan dokumentasi, sedangkan matriks data hasil kegiatan dan matriks analisis data disajikan pada Lampiran 2 dan Lampiran 3.`,
        ...(K && K.analisis ? [kt(K.analisis)] : [])
      ].join("\n"),
      hasil: t.obs ? `Selama pelaksanaan kegiatan, tim mencatat ${t.obs} catatan temuan pada ${t.coords} titik koordinat unik${I.gridText ? ` di ${I.gridText}` : ""}, terdiri atas ${listText(M.groups.map((x) => `${x.items.length} catatan ${lowerVocab(x.label)}`))}. Satu titik koordinat dapat memuat lebih dari satu catatan, sehingga jumlah catatan tidak sama dengan jumlah titik lokasi atau jumlah kejadian. Ringkasan setiap kategori disajikan pada uraian dan tabel berikut, sedangkan rincian setiap catatan disajikan pada Lampiran 2 (Matriks Data Hasil Kegiatan) dan sebaran temuan pada Lampiran 3 (Matriks Analisis Data).`
        : "Selama pelaksanaan kegiatan tidak terdapat catatan temuan yang direkam menggunakan aplikasi SMART Mobile.",
      pembahasan: "", kesimpulan: "", saran: "", penutup: ""
    };

    /* Hasil per kategori */
    for (const gr of M.groups) {
      const label = lowerVocab(gr.label), isBio = BIODIV.includes(gr.top);
      const rg = isBio && gr.top !== "satwaliar" ? "" : ragam(gr.items, gr.label);
      let s = `Tim mencatat ${gr.items.length} catatan ${label} pada ${gr.coords} titik koordinat${rg ? `, berupa ${rg}` : ""}.`;
      if (gr.species.length || gr.unidentified) {
        s += ` Dari ${gr.items.length} catatan tersebut, ${gr.species.length} jenis telah teridentifikasi${gr.species.length ? `, antara lain ${listText(gr.species.slice(0, 5).map((x) => spName(x.name)))}` : ""}.`;
        if (gr.unidentified) {
          const ket = [...new Set(gr.items.filter((o) => o.unidentified).map((o) => (attrOf(o, "keterangan") || {}).text).filter(Boolean))];
          s += ` Sebanyak ${gr.unidentified} catatan berstatus "Belum ada di daftar aplikasi", yaitu jenisnya belum tersedia dalam daftar jenis aplikasi SMART${ket.length ? `; berdasarkan keterangan tim, catatan tersebut adalah ${listText(ket)}` : " dan masih memerlukan identifikasi lanjutan"}. Catatan ini tidak dihitung sebagai jenis tersendiri.`;
        }
      }
      if (gr.subs.some((x) => /penggembalaan|pengembalaan|ternak/i.test(x.label))) s += " Data kelompok penggembala, asal, dan kode tanda ternak dicatat pada Lampiran 2.";
      notes["hasil_" + gr.top] = s + " Ringkasan catatan disajikan pada tabel berikut:";
    }

    /* Pembahasan */
    const pem = [], kes = [], sar = [];
    const amGrids = uniqGrids(am ? am.items : []);
    // Desa binaan dan akses resor tempat sebagian besar temuan aktivitas manusia (batas resor 2026)
    const resAM = Wl ? Wl.data.resor.find((r) => r.nama === mostCommon(amx.map((o) => o.wp.resort))) : null;
    const ad = Wl ? Wl.aksesDesa(resAM ? { type: "resor", resor: resAM } : W, I.share) : null;
    if (amx.length) {
      const pel = tally(amx, "pelanggaran"), ya = (pel.find((x) => /^ya$/i.test(x.v)) || {}).n || 0, bukan = (pel.find((x) => /^(bukan|tidak)/i.test(x.v)) || {}).n || 0;
      const tind = tally(amx, "tindakan"), akt = tally(amx, "keaktifan");
      let s = `Catatan aktivitas manusia${fires.length ? " di luar kebakaran" : ""} (${amx.length} catatan) berupa ${ragam(amx, "")}${uniqGrids(amx).length ? `, berada di Grid ${listText(uniqGrids(amx))}` : ""}.`;
      s += ya || bukan ? ` Berdasarkan penilaian tim, ${[ya ? `${ya} catatan merupakan dugaan pelanggaran` : "", bukan ? `${bukan} catatan bukan pelanggaran` : ""].filter(Boolean).join(" dan ")}.` : " Catatan aktivitas manusia tidak otomatis merupakan pelanggaran sampai diverifikasi.";
      if (akt.length) s += ` Status aktivitas saat ditemukan: ${tallyText(akt)}.`;
      if (tind.length) s += ` Tindakan yang tercatat di SMART berupa ${tallyText(tind)}.`;
      else if ((f.tindakanAM || []).length) s += ` Tindakan yang dilakukan tim berupa ${listText(f.tindakanAM)}.`;
      if (f.pelakuAM) s += ` Pelaku aktivitas ${f.pelakuAM}.`;
      s += ad && ad.desa ? ` Lokasi temuan berada di wilayah Resor ${ad.resor.nama}, yang memiliki desa binaan ${ad.desa}${ad.akses ? ` serta dapat dijangkau dengan ${ad.akses}` : ""}, sehingga interaksi masyarakat dengan kawasan perlu terus dipantau, terutama pada ${musim(I.mulai)}.`
        : ` Kegiatan berlangsung pada ${musim(I.mulai)}, sehingga interaksi masyarakat dengan kawasan perlu terus dipantau.`;
      if (amx.some((o) => /pengembalaan|penggembalaan|ternak/i.test(o.catLabel))) s += " Penggembalaan ternak di dalam kawasan perlu ditangani melalui pendataan kelompok penggembala dan pembinaan bersama pemerintah desa.";
      pem.push(s);
    }
    if (fires.length) {
      const tip = tally(fires, "tipetemuan"), sebab = tally(fires, "penyebabkebakaran"), tind = tally(fires, "tindakan"), jml = sumByUnit(fires);
      const haSmart = fires.filter((o) => /^(ha|hektar|hektare)$/i.test(o.unit || "")).reduce((s, o) => s + (o.count || 0), 0);
      let s = `Indikasi kebakaran tercatat pada ${fires.length} catatan, berupa ${tallyText(tip.length ? tip : subsOf(fires))}${uniqGrids(fires).length ? ` di Grid ${listText(uniqGrids(fires))}` : ""}${jml.length ? `, dengan jumlah objek tercatat ${listText(jml)}` : ""}.`;
      if (sebab.length) s += ` Penyebab kebakaran menurut catatan SMART: ${tallyText(sebab)}.`;
      if (tind.length) s += ` Tindakan yang tercatat: ${tallyText(tind)}.`;
      if (C.apiAktif) {
        s += ` Terhadap api aktif, tim melakukan pemadaman awal${(f.apiAlat || []).length ? ` menggunakan ${listText(f.apiAlat)}` : ""}${(f.apiKendala || []).length ? `, dengan kendala ${listText(f.apiKendala)}` : ""}.`;
        if (f.apiKondisi) s += ` Kondisi terakhir api saat tim meninggalkan lokasi: ${f.apiKondisi}.`;
      }
      if (Number(f.apiLuas) > 0) s += ` Luas area terbakar diperkirakan ±${fmtNum(Number(f.apiLuas))} ha${f.apiUkur ? `, diukur dengan ${f.apiUkur}` : ""}.`;
      else if (haSmart > 0) s += ` Luas area terbakar yang tercatat di SMART ±${fmtNum(haSmart)} ha.`;
      else s += " Luas area terbakar belum diukur; angka jumlah pada tabel menunjukkan objek yang dihitung (misalnya batang terbakar), bukan luas kebakaran.";
      if (f.apiSumber) s += f.apiSumber === "belum diketahui" ? " Sumber api belum diketahui." : ` Dugaan sumber api adalah ${f.apiSumber}${f.apiDasar ? `, berdasarkan ${f.apiDasar}` : ""}.`;
      pem.push(s);
    }
    if (bio.length) {
      let s = `Pemantauan keanekaragaman hayati mencatat ${listText(bio.map((x) => `${x.items.length} catatan ${lowerVocab(x.label)} (${x.species.length} jenis teridentifikasi${x.unidentified ? `, ${x.unidentified} catatan belum ada di daftar aplikasi` : ""})`))}.`;
      if (sw) {
        const jumpa = sw.items.filter((o) => /perjumpaan/.test(o.category)), jejak = sw.items.filter((o) => !/perjumpaan/.test(o.category));
        const dasar = [jumpa.length ? `perjumpaan langsung (${jumpa.length} catatan)` : "", ...tally(jejak, "tipetemuan").map((x) => `${lowerVocab(x.v)} (${x.n} catatan)`)].filter(Boolean);
        if (dasar.length) s += ` Identifikasi jenis satwa didasarkan pada ${listText(dasar)}.`;
        const ind = sumByUnit(jumpa);
        if (ind.length) s += ` Jumlah satwa yang dijumpai langsung sebanyak ${listText(ind)}.`;
        const lindung = [...new Set(sw.items.filter((o) => attrIs(o, "status", /^dilindungi$/i)).map((o) => o.species).filter(Boolean))];
        if (lindung.length) s += ` Jenis dilindungi yang tercatat adalah ${listText(lindung.map(spName))}.`;
      }
      const kunci = Wl && Wl.data.kawasan ? ((Wl.data.kawasan.satwa_kunci || {}).jenis || []) : [];
      if (kunci.length) {
        const hit = kunci.map((j) => ({ j, n: M.observations.filter((o) => o.species && (o.species.toLowerCase().includes(j.ilmiah.toLowerCase()) || o.species.toLowerCase().startsWith(j.nama.toLowerCase()))).length }));
        const ada = hit.filter((h) => h.n), tidak = hit.filter((h) => !h.n);
        if (ada.length) s += ` Satwa kunci kawasan yang tercatat adalah ${listText(ada.map((h) => `${h.j.nama} (${h.j.ilmiah}) sebanyak ${h.n} catatan`))}.`;
        if (tidak.length) s += ` Satwa kunci ${listText(tidak.map((h) => `${h.j.nama} (${h.j.ilmiah})`))} tidak tercatat selama patroli.`;
      }
      if (gp.length) s += ` Temuan tersebut berada pada habitat dengan ${gp[0]}.`;
      pem.push(s);
    }
    if (gc) pem.push(`Ground check dilakukan pada ${gc.coords} titik koordinat untuk memperoleh data tutupan lahan aktual. Klasifikasi didasarkan pada pengamatan visual struktur vegetasi di lapangan sesuai pilihan klasifikasi pada Data Model SMART Balai${gp.length ? `, dengan hasil ${gp.join(" serta ")}` : ""}.`);
    if (ft) {
      const kon = tally(ft.items, "kondisi"), perlu = ft.items.filter((o) => o.followUp), pal = tally(ft.items, "nopal");
      let s = `Pengamatan fitur (${ft.items.length} catatan) meliputi ${ragam(ft.items, ft.label)}${pal.length ? `, termasuk pal batas nomor ${listText(pal.map((x) => x.v))}` : ""}.`;
      if (kon.length) s += ` Kondisi yang tercatat: ${tallyText(kon)}.`;
      s += perlu.length ? ` Sebanyak ${perlu.length} catatan memerlukan tindak lanjut, yaitu ${listText([...new Set(perlu.map((o) => lowerVocab((attrOf(o, "tipetemuan") || {}).text || o.catLabel)))])}.` : " Seluruh fitur yang diamati tidak memerlukan tindak lanjut.";
      pem.push(s);
    }
    // Pembahasan khusus judul
    const mas = M.members.filter((m) => MASYARAKAT.includes(m.unsur)), apa = M.members.filter((m) => APARAT.includes(m.unsur));
    const sos = M.observations.filter((o) => /sosialisasi/.test(o.category));
    const kam = kameraRows(f);
    const BAHAS = {
      mitra: () => (mas.length ? `Unsur masyarakat dalam tim (${unsurCount(mas)}) ${(f.mitraPeran || []).length ? `berperan ${listText(f.mitraPeran)}` : "membantu tim berdasarkan pengetahuan lokal mengenai jalur dan kondisi lapangan"}. Patroli bersama ini sekaligus menjadi sarana pembinaan mitra dalam perlindungan kawasan.` : ""),
      aparat: () => (apa.length ? `Keterlibatan ${unsurCount(apa)} memperkuat kehadiran aparat di lapangan dan efek pencegahan gangguan kawasan${(f.aparatPeran || []).length ? `, dengan peran ${listText(f.aparatPeran)}` : ""}.` : ""),
      tipihut: () => (f.tipihut ? `Selama kegiatan, dugaan tindak pidana kehutanan ${f.tipihut}.` : ""),
      sosialisasi: () => {
        const part = sos.reduce((s, o) => s + (Number(((attrOf(o, "jumlahpartisipan") || {}).raw || [])[0]?.value) || 0), 0);
        let s = f.sosJumlah || (f.sosDesa || []).length || (f.sosMateri || []).length
          ? `Imbauan pencegahan kebakaran disampaikan kepada ${Number(f.sosJumlah) > 0 ? `${nTxt(Number(f.sosJumlah))} orang ` : ""}masyarakat${(f.sosDesa || []).length ? ` dari Desa ${listText(f.sosDesa)}` : ""}${(f.sosMateri || []).length ? `, dengan materi ${listText(f.sosMateri)}` : ""}.`
          : "Imbauan larangan membakar disampaikan secara langsung kepada masyarakat yang dijumpai di dalam dan sekitar kawasan.";
        if (sos.length) s += ` Kegiatan sosialisasi tercatat di SMART pada ${sos.length} titik${part ? ` dengan jumlah partisipan ${part} orang` : ""}.`;
        return s;
      },
      hotspot: () => (f.hotspot ? `Pemeriksaan titik panas (hotspot): ${f.hotspot}${Number(f.hotspotN) > 0 ? `; jumlah titik panas yang diperiksa ${nTxt(Number(f.hotspotN))} titik` : ""}.` : ""),
      rawan: () => {
        if ((f.rawanFaktor || []).length) return `Faktor kerawanan kebakaran yang diamati di lokasi meliputi ${listText(f.rawanFaktor)}.`;
        const savana = gc && gc.items.some((o) => /savana|padang rumput/i.test(o.attrs.map((a) => a.text).join(" ")));
        return savana && musim(I.mulai) === "musim kemarau" ? "Tutupan savana pada musim kemarau merupakan bahan bakar yang mudah terbakar, sehingga lokasi patroli termasuk rawan kebakaran." : "";
      },
      potensi: () => {
        // Potensi: satwa, tumbuhan, dan fitur sumber air/wisata (spesies invasif dan sarana prasarana bukan potensi)
        const air = ft ? ft.items.filter((o) => /air|wisata|geologi/i.test(o.catLabel + " " + ((attrOf(o, "tipetemuan") || {}).text || ""))) : [];
        const parts = [...bio.filter((x) => x.top !== "spesiesinvasif" && x.species.length).map((x) => `${x.species.length} jenis ${lowerVocab(x.label)}`), air.length ? `${air.length} titik sumber air dan potensi wisata` : ""].filter(Boolean);
        const pot = W ? [...new Set(W.resors.flatMap((r) => r.potensi || []))].slice(0, 3).map(lowerVocab) : [];
        return parts.length ? `Potensi kawasan yang terdata selama kegiatan meliputi ${listText(parts)}.${pot.length && kajian ? ` Data ini melengkapi potensi wilayah kerja ${W.nama} menurut ${kajian}, antara lain ${listText(pot)}.` : ""}` : "";
      },
      kamera: () => {
        if (!kam.length) return "";
        const pasang = kam.filter((r) => r.pasang && !r.unduh), unduh = kam.filter((r) => r.unduh);
        let s = `Kegiatan kamera jebak meliputi ${[pasang.length ? `pemasangan ${nTxt(pasang.length)} unit kamera (${listText(pasang.map((r) => r.kode.trim()))})` : "", unduh.length ? `pengunduhan data ${nTxt(unduh.length)} unit kamera (${listText(unduh.map((r) => r.kode.trim()))})` : ""].filter(Boolean).join(" dan ") || `${nTxt(kam.length)} unit kamera`}.`;
        const hari = unduh.reduce((a, r) => a + (hariAktif(r) || 0), 0), foto = unduh.reduce((a, r) => a + (numVal(r.foto) || 0), 0);
        if (unduh.length && (hari || foto)) s += ` Kamera yang diunduh ${hari ? `aktif selama total ${hari} hari kamera (trap-days)` : ""}${hari && foto ? " dengan " : foto ? "merekam " : ""}${foto ? `${foto} foto/video` : ""}.`;
        const satwa = [...new Set(kam.flatMap((r) => String(r.satwa || "").split(/[;,]/).map((x) => x.trim()).filter(Boolean)))];
        if (satwa.length) s += ` Jenis satwa yang terekam meliputi ${listText(satwa)}.`;
        const kon = tally(kam.map((r) => ({ attrs: [{ key: "k", vals: r.kondisi ? [r.kondisi] : [] }] })), "k");
        if (kon.length) s += ` Kondisi kamera: ${tallyText(kon, "unit")}.`;
        if (f.kameraManusia) s += ` Rekaman aktivitas manusia pada kamera jebak: ${f.kameraManusia}.`;
        return s;
      }
    };
    for (const b of (K && K.bahas) || []) { const s = BAHAS[b] && BAHAS[b](); if (s) pem.push(s); }
    if (!(K && K.bahas || []).includes("tipihut") && f.tipihut) pem.push(BAHAS.tipihut());
    // Keterbatasan pengamatan
    const lim = [...(f.cuaca && /hujan|kabut|angin/.test(f.cuaca) ? [`cuaca ${f.cuaca}`] : []), ...kendala];
    if (t.days < I.hari) lim.push(`perekaman data SMART yang hanya dilakukan pada ${nTxt(t.days)} dari ${nTxt(I.hari)} hari pelaksanaan`);
    pem.push(`Lintasan yang terekam sepanjang ${modeTxt}.${lim.length ? ` Keterbatasan pengamatan selama kegiatan meliputi ${listText(lim)}, sehingga data yang dilaporkan terbatas pada jalur dan waktu perekaman tersebut.` : (f.kendala || []).includes(NONE_KENDALA) ? " Tidak terdapat kendala berarti selama pengamatan; data yang dilaporkan terbatas pada jalur dan waktu perekaman tersebut." : " Data yang dilaporkan terbatas pada jalur dan waktu perekaman tersebut."}`);
    if (M.duplicates.length) {
      const near = M.duplicates.filter((a) => { const ms = a.map((o) => minutes(o.wp.time)); return Math.max(...ms) - Math.min(...ms) <= 1; }).length, far = M.duplicates.length - near;
      pem.push(`Terdapat ${M.duplicates.length} kelompok catatan dengan kategori, jenis, tanggal, dan koordinat yang sama (ditandai * pada Lampiran 2).${near ? ` Sebanyak ${near} kelompok dengan selisih waktu pencatatan paling lama 1 menit kemungkinan merupakan pencatatan ganda.` : ""}${far ? ` Sebanyak ${far} kelompok dengan selisih waktu lebih lama kemungkinan merupakan pengamatan berbeda pada titik yang sama.` : ""} Catatan tersebut tidak dihapus dan tetap dihitung dalam tabel.`);
    }

    /* Simpulan: menjawab tujuan kegiatan */
    if (amx.length) kes.push(`Masih terdapat ${amx.length} catatan aktivitas manusia di dalam kawasan pada ${new Set(amx.map((o) => `${o.wp.x.toFixed(5)},${o.wp.y.toFixed(5)}`)).size} titik koordinat, berupa ${listText(subsOf(amx).map((x) => lowerVocab(x.v)))}.`);
    else kes.push("Tidak tercatat aktivitas manusia yang mengganggu kawasan selama patroli.");
    if (fires.length) kes.push(`Tercatat ${fires.length} catatan indikasi kebakaran berupa ${listText(tally(fires, "tipetemuan").map((x) => lowerVocab(x.v))) || "kebakaran hutan dan lahan"}${f.apiKondisi ? `; kondisi terakhir api ${f.apiKondisi}` : ""}.`);
    else if (I.fire) kes.push("Tidak ditemukan indikasi kebakaran hutan dan lahan selama patroli.");
    if (bio.length) {
      const lindung = sw ? [...new Set(sw.items.filter((o) => attrIs(o, "status", /^dilindungi$/i)).map((o) => o.species))] : [];
      kes.push(`Keanekaragaman hayati yang tercatat meliputi ${listText(bio.map((x) => `${x.species.length} jenis ${lowerVocab(x.label)}`))} yang teridentifikasi${lindung.length ? `, termasuk ${lindung.length} jenis dilindungi` : ""}.`);
    }
    if (gp.length) kes.push(`Hasil ground check menunjukkan ${gp.join(" dan ")}.`);
    if (ft) {
      const kon = tally(ft.items, "kondisi"), perlu = ft.items.filter((o) => o.followUp).length;
      kes.push(`Sarana prasarana dan fitur yang diamati (${ft.items.length} catatan)${kon.length ? ` umumnya dalam kondisi ${lowerVocab(kon[0].v)}` : " telah terdata"}${perlu ? `, dengan ${perlu} catatan memerlukan tindak lanjut` : ""}.`);
    }
    if (kam.length) kes.push(`Sebanyak ${nTxt(kam.length)} unit kamera jebak telah ${kam.some((r) => r.unduh) ? (kam.some((r) => !r.unduh) ? "dipasang dan diunduh datanya" : "diunduh datanya") : "dipasang"}.`);
    if (C.cegah && Number(f.sosJumlah) > 0) kes.push(`Imbauan pencegahan kebakaran telah disampaikan kepada ${nTxt(Number(f.sosJumlah))} orang masyarakat.`);

    /* Saran */
    const kapan = f.tindakLanjut || "pada patroli rutin berikutnya";
    if (amGrids.length) sar.push(`Menetapkan Grid ${listText(amGrids)} sebagai lokasi prioritas patroli lanjutan oleh ${pelaksana} ${kapan}.`);
    if (fires.length) sar.push(C.apiAktif ? "Melakukan pemeriksaan ulang lokasi kebakaran dalam waktu 1 × 24 jam untuk memastikan api benar-benar padam, serta pendalaman sumber api bersama Manggala Agni dan MPA setempat."
      : "Memantau lokasi bekas kebakaran dan mendalami dugaan sumber api bersama MPA dan masyarakat setempat.");
    if (amx.length) sar.push(`Menindaklanjuti catatan aktivitas manusia melalui verifikasi lapangan, imbauan, dan edukasi kepada masyarakat${ad && ad.desa ? ` ${ad.desa}` : ""} sesuai prosedur.`);
    const inv = g("spesiesinvasif");
    if (inv) sar.push(`Melakukan pemantauan dan pengendalian spesies invasif${inv.species.length ? `, yaitu ${listText(inv.species.slice(0, 3).map((x) => spName(x.name)))},` : ""} di lokasi temuan.`);
    const unid = M.groups.reduce((s, x) => s + x.unidentified, 0);
    if (unid) sar.push(`Melakukan identifikasi lanjutan terhadap ${unid} catatan jenis yang belum ada di daftar aplikasi dan mengusulkan penambahannya ke Data Model SMART.`);
    if (ft && ft.items.some((o) => o.followUp)) sar.push(`Memperbaiki atau mengganti fitur yang memerlukan tindak lanjut ${kapan}.`);
    if (K) sar.push(...(K.saran || []).map(kt));
    if (C.kamera) sar.push(f.kameraJadwal ? `Melakukan pengecekan dan pengunduhan data kamera jebak berikutnya pada tanggal ${tglPanjang(f.kameraJadwal)}.` : "Melakukan pengecekan dan pengunduhan data kamera jebak secara berkala sesuai kapasitas baterai dan kartu memori.");
    sar.push("Melanjutkan patroli rutin pada jalur dan grid yang sama untuk pemantauan berkala.");

    notes.pembahasan = pem.map((x, i) => `${i + 1}. ${x}`).join("\n");
    notes.kesimpulan = [`Berdasarkan kegiatan ${I.judulLengkap}, dapat disimpulkan sebagai berikut:`, ...kes.map((x, i) => `${i + 1}. ${x}`)].join("\n");
    notes.saran = ["Rekomendasi tindak lanjut berdasarkan hasil kegiatan adalah sebagai berikut:", ...sar.map((x, i) => `${i + 1}. ${x}`)].join("\n");
    const dukung = [...new Set(M.members.map((m) => m.unsur).filter((u) => u && u !== "balai"))].map((u) => UNSUR_SHORT[u] || u);
    notes.penutup = [
      `Demikian laporan pelaksanaan kegiatan ${I.judulLengkap} ini disusun sebagai pertanggungjawaban pelaksanaan Surat Tugas Nomor ${I.nomorST || "……………"}. Kami berharap laporan ini dapat menjadi bahan pertimbangan pimpinan dalam pengambilan kebijakan pengelolaan kawasan Taman Nasional Tambora, dan mohon arahan pimpinan untuk tindak lanjut hasil kegiatan.`,
      `Kami menyampaikan terima kasih kepada ${dukung.length ? `${listText(dukung)} yang telah mendukung pelaksanaan kegiatan ini, serta kepada ` : ""}seluruh pihak yang telah membantu kelancaran kegiatan.`
    ].join("\n");
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
    const C = faktaCtx(M, I), f = I.facts || {}, shown = faktaShown(C);
    const wajib = shown.filter((x) => x.req && x.req(C)), pilihan = shown.filter((x) => !(x.req && x.req(C)));
    const terisi = pilihan.filter((x) => filled(x, f[x.k]));
    const d = M.wilayahAuto;
    return [
      { label: "File ekspor patroli SMART", ok: true, note: `${M.totals.obs} catatan pada ${M.totals.coords} titik koordinat unik, ${M.totals.photos} foto` },
      { label: "Jumlah catatan harian = jumlah tabel kategori", ok: sumGroups === sumDays, note: `${sumDays} catatan harian, ${sumGroups} di tabel kategori` },
      { label: "Data Model SMART (nama kategori dan jenis)", ok: M.unknown.size === 0, note: M.unknown.size ? `${M.unknown.size} kode belum punya nama` : "semua kode punya nama" },
      { label: "Kemungkinan pencatatan ganda", ok: !M.duplicates.length, note: M.duplicates.length ? M.duplicates.map((a) => `${a[0].species || a[0].catLabel} ${a[0].wp.date} (WP ${a.map((o) => o.wp.id + " " + o.wp.time.substr(0, 5)).join(", ")})`).slice(0, 3).join("; ") + " — periksa, jangan langsung dihapus" : "" },
      { label: "Judul kegiatan (mandat patroli)", ok: !!(info.judul || M.patrol.mandate), note: `"${I.judul}"${I.keg ? (I.keg.judul === I.judul ? "" : `; narasi mengikuti judul baku "${I.keg.judul}"`) : "; tidak cocok dengan judul baku, narasi umum dipakai"}` },
      { label: "Wilayah kerja (SPTN/resor)", ok: !!I.W, note: I.W ? `${I.W.nama}${I.wilayahAuto ? ` (otomatis${d ? `, ${Math.round(d.counts[0].share * 100)}% titik di Resor ${d.counts[0].resor.nama}` : ""}; ubah di Data kegiatan bila perlu)` : ""}` : "pilih wilayah kerja di Data kegiatan" },
      { label: "Nomor dan tanggal Surat Tugas", ok: !!(I.nomorST && I.tanggalST), note: I.nomorST || "ID patroli bukan nomor ST, isi manual" },
      { label: "Scan Surat Tugas untuk lampiran", ok: (scans || []).length > 0, note: (scans || []).length ? `${scans.length} halaman` : "" },
      { label: `DIPA TA.${I.year}`, ok: !!(I.nomorDipa && I.tanggalDipa), note: I.nomorDipa ? I.nomorDipa : "belum ada di data/dipa.json" },
      { label: "Rincian anggaran", ok: I.total > 0, note: I.anggaran },
      { label: "Tanggal pelaksanaan sesuai ST", ok: !!(info.tglMulai && info.tglSelesai), note: `${periodeSd(I.mulai, I.selesai)}${info.tglMulai ? "" : " (sementara dari data SMART)"}` },
      { label: "Nama bergelar dan jabatan anggota", ok: !missingDir.length, note: missingDir.length ? `isi manual: ${missingDir.map((m) => m.smartName).join(", ")}` : "" },
      { label: "Unsur anggota (Balai/Polri/TNI/masyarakat)", ok: !noUnsur.length, note: noUnsur.length ? `pilih unsur: ${noUnsur.map((m) => m.smartName).join(", ")}` : "" },
      kegTeamCheck(I.keg, M.members),
      { label: "Jumlah alat dan bahan yang digunakan", ok: !alatKosong.length, note: alatKosong.length ? `${alatKosong.length} baris belum diisi jumlahnya` : "" },
      ...wajib.map((x) => ({ label: `Isian lapangan: ${x.label}`, ok: filled(x, f[x.k]), note: filled(x, f[x.k]) ? "" : "wajib diisi" })),
      pilihan.length ? { label: "Isian lapangan (pilihan)", ok: terisi.length === pilihan.length, opt: true, note: `${terisi.length} dari ${pilihan.length} terisi; isian kosong tidak ditulis di narasi` } : null,
      { label: "Kepala Balai dan Kasubbag TU (nama, NIP)", ok: !!(profile.kepalaBalaiNama && profile.kepalaBalaiNip && profile.kasubbagNama && profile.kasubbagNip) },
      { label: "Lapisan grid dan zonasi", ok: (M.hasLayers.grid && M.hasLayers.zonasi) || !!info.grids, note: M.hasLayers.grid ? `grid: ${M.grids.join(", ") || "-"}${M.zonas.length ? "; " + M.zonas.join(", ") : ""}` : info.grids ? "diisi manual" : "" },
      { label: "Tempat dan tanggal penandatanganan", ok: !!info.tanggalLaporan, note: `${I.kota || "…"}, ${info.tanggalLaporan ? tglPanjang(I.tanggalLaporan) : "sementara " + tglPanjang(I.tanggalLaporan)}` },
      hasPH(notes) ? { label: "Isian bertanda [ … ] di narasi", ok: false, note: "narasi lama yang tersimpan masih memuat isian; klik Atur ulang narasi atau lengkapi teks berlatar kuning" } : null,
      { label: "Narasi sudah diperiksa", ok: !!info.narasiOk, note: "centang setelah teks diperiksa" }
    ].filter(Boolean);
  }

  /* ---------- HTML ---------- */
  const xy = (v) => (isFinite(v) ? v.toFixed(6) : "");

  // Narasi bisa diedit langsung; nama ilmiah dicetak miring; isian [ … ] lama disorot.
  // Tiap baris satu blok: "1. …" dan "a. …" menggantung seperti butir bernomor di Word, baris lain paragraf menjorok 1 cm.
  function noteBlock(notes, key, lv = 2) {
    const text = String(notes[key] || "");
    const html = text ? text.split("\n").map((l) => {
      const t = l.trim(), cls = /^\d+[.)]\s/.test(t) ? "num" : /^[a-z][.)]\s/.test(t) ? "let" : "par";
      return `<div class="ln ${cls}">${t ? italicLatin(esc(l).replace(/\[([^\]]+)\]/g, '<mark class="ph">[$1]</mark>')) : "<br>"}</div>`;
    }).join("") : "";
    return `<div class="note para lv${lv}" contenteditable="true" data-note="${key}">${html}</div>`;
  }
  const olList = (arr, lv = 2) => `<ol class="list lv${lv}">${arr.map((x) => `<li>${italicLatin(esc(x))}</li>`).join("")}</ol>`;

  function columnsFor(gr, M) {
    const multi = gr.subs.length > 1 || gr.subs[0].label !== gr.label;
    const keys = [];
    gr.items.forEach((o) => o.attrs.forEach((a) => { if (!keys.includes(a.key)) keys.push(a.key); }));
    const rank = (k) => (/^jenis(satwa|tumbuhan|biota)/.test(k) ? 0 : k === "tipetemuan" ? 1 : k === "jumlah" ? 2 : k === "satuan" ? 3 : /^keterangan/.test(k) ? 9 : 5);
    keys.sort((a, b) => rank(a) - rank(b));
    const PREF = {
      aktivitasmanusia: ["tipetemuan", "jumlah", "satuan", "tindakan", "keterangan"],
      satwaliar: ["jenissatwa", "jumlah", "satuan", "tipetemuan", "status"],
      tumbuhan: ["jenistumbuhan", "tipetemuan", "kondisitumbuhan"],
      spesiesinvasif: ["jenistumbuhan", "jumlah", "satuan"],
      fitur: ["tipetemuan", "kondisi", "nopal", "perlutindaklanjut"],
      groundcheck: ["klasifikasi4", "klasifikasi3", "klasifikasi02"]
    };
    if (PREF[gr.top]) { const pk = PREF[gr.top].filter((k) => keys.includes(k)); if (pk.length) keys.splice(0, keys.length, ...pk); }
    else if (keys.length > 6) keys.splice(6);
    const labelOf = (k) => gr.items.flatMap((o) => o.attrs).find((a) => a.key === k).label;
    return { multi, keys, heads: keys.map(labelOf), grid: M.hasLayers.grid, zona: M.hasLayers.zonasi };
  }

  function photoFig(p, url, caption) {
    return `<figure>${url ? `<img src="${url}" alt="">` : `<div class="nophoto">${esc(p.file)}</div>`}<figcaption>${caption}</figcaption></figure>`;
  }
  const coordKeyOf = (o) => `${o.wp.x.toFixed(5)},${o.wp.y.toFixed(5)}`;
  // Ringkasan per kategori di bagian Hasil; rincian per catatan dipindah ke Lampiran 2
  function rekapTable(gr, M) {
    const grid = M.hasLayers.grid || M.observations.some((o) => o.wp.grid);
    const gridCell = (items) => (grid ? `<td class="c">${esc(uniqGrids(items).join(", ") || "-")}</td>` : "");
    if (BIODIV.includes(gr.top)) {
      const hasStatus = gr.items.some((o) => attrOf(o, "status"));
      const rows = gr.species.map((s) => ({ name: sci(s.name), n: s.records, jml: s.total ? `${fmtNum(s.total)} ${s.unit || ""}`.trim() : "-",
        st: [...new Set(s.items.map((o) => (attrOf(o, "status") || {}).text).filter(Boolean))].join(", ") || "-", items: s.items }));
      const unid = gr.items.filter((o) => o.unidentified), noSp = gr.items.filter((o) => !o.species);
      if (unid.length) rows.push({ name: "Belum ada di daftar aplikasi", n: unid.length, jml: sumByUnit(unid).join(", ") || "-", st: "-", items: unid });
      if (noSp.length) rows.push({ name: "Tanpa nama jenis", n: noSp.length, jml: sumByUnit(noSp).join(", ") || "-", st: "-", items: noSp });
      return `<table class="data rekap"><thead><tr><th>No</th><th>Jenis</th><th>Jumlah Catatan</th><th>Jumlah Individu/ Objek</th>${hasStatus ? "<th>Status</th>" : ""}${grid ? "<th>Grid</th>" : ""}</tr></thead><tbody>${rows.map((r, i) => `<tr><td class="c">${i + 1}</td><td>${r.name}</td><td class="c">${r.n}</td><td class="c">${esc(r.jml)}</td>${hasStatus ? `<td class="c">${esc(r.st)}</td>` : ""}${gridCell(r.items)}</tr>`).join("")}<tr class="total"><td></td><td>Jumlah</td><td class="c">${gr.items.length}</td><td></td>${hasStatus ? "<td></td>" : ""}${grid ? "<td></td>" : ""}</tr></tbody></table>`;
    }
    const kindOf = (o) => (gr.top === "groundcheck" ? (attrOf(o, "klasifikasi4") || attrOf(o, "klasifikasi02") || attrOf(o, "klasifikasi01") || {}).text : (attrOf(o, "tipetemuan") || {}).text) || "";
    const map = new Map();
    gr.items.forEach((o) => { const k = o.catLabel + "|" + kindOf(o); if (!map.has(k)) map.set(k, { sub: o.catLabel, kind: kindOf(o), items: [] }); map.get(k).items.push(o); });
    const multi = gr.subs.length > 1 || gr.subs[0].label !== gr.label, hasCount = gr.items.some((o) => o.count != null);
    const rows = [...map.values()];
    return `<table class="data rekap"><thead><tr><th>No</th><th>Jenis Temuan</th><th>Jumlah Catatan</th><th>Titik Koordinat</th>${hasCount ? "<th>Jumlah Objek</th>" : ""}${grid ? "<th>Grid</th>" : ""}</tr></thead><tbody>${rows.map((r, i) => `<tr><td class="c">${i + 1}</td><td>${esc(multi ? `${r.sub}${r.kind ? " – " + r.kind : ""}` : r.kind || r.sub)}</td><td class="c">${r.items.length}</td><td class="c">${new Set(r.items.map(coordKeyOf)).size}</td>${hasCount ? `<td class="c">${esc(sumByUnit(r.items).join(", ") || "-")}</td>` : ""}${gridCell(r.items)}</tr>`).join("")}<tr class="total"><td></td><td>Jumlah</td><td class="c">${gr.items.length}</td><td class="c">${gr.coords}</td>${hasCount ? "<td></td>" : ""}${grid ? "<td></td>" : ""}</tr></tbody></table>`;
  }
  // Matriks data per catatan (Lampiran 2)
  function detailTable(gr, M) {
    const C = columnsFor(gr, M);
    return `<table class="data detail"><thead><tr><th>No</th><th>Tanggal/ Jam</th><th>Koordinat X/ Y</th>${C.multi ? "<th>Jenis Temuan</th>" : ""}${C.grid ? "<th>Grid</th>" : ""}${C.zona ? "<th>Zona</th>" : ""}${C.heads.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>
      ${gr.items.map((o, i) => `<tr${o.dup ? ' class="dup"' : ""}><td class="c">${i + 1}${o.dup ? "*" : ""}</td><td class="nw">${esc(nb(tglPanjang(o.wp.date)))}<br>${esc(jam((o.wp.time || "").substr(0, 5)))}</td><td class="nw">${xy(o.wp.x)}<br>${xy(o.wp.y)}</td>${C.multi ? `<td>${esc(o.catLabel)}</td>` : ""}${C.grid ? `<td class="c">${esc(o.wp.grid || "-")}</td>` : ""}${C.zona ? `<td>${esc(o.wp.zona || "-")}</td>` : ""}${C.keys.map((k) => { const a = o.attrs.find((x) => x.key === k); return `<td>${a ? (/^jenis(satwa|tumbuhan|biota)/.test(k) ? sci(a.text) : esc(a.text)) : "-"}</td>`; }).join("")}</tr>`).join("")}</tbody></table>`;
  }
  // Matriks analisis (Lampiran 3): jumlah catatan per grid (atau per hari bila tanpa grid) dan kategori
  function matrixTable(M) {
    const byGrid = M.observations.some((o) => o.wp.grid);
    const keyOf = (o) => (byGrid ? o.wp.grid || "Di luar grid" : String(o.day.no));
    const keys = byGrid ? [...new Set(M.observations.map(keyOf))].sort((a, b) => (a === "Di luar grid") - (b === "Di luar grid") || (parseFloat(a) || 0) - (parseFloat(b) || 0) || a.localeCompare(b)) : M.days.map((d) => String(d.no));
    const head = byGrid ? "<th>Grid</th>" : "<th>Hari/ Tanggal</th>";
    const label = (k) => (byGrid ? esc(k) : esc(nb(tglPanjang(M.days[Number(k) - 1].date))));
    const rows = keys.map((k, i) => {
      const its = M.observations.filter((o) => keyOf(o) === k);
      return `<tr><td class="c">${i + 1}</td><td class="${byGrid ? "c" : "nw"}">${label(k)}</td>${M.groups.map((g) => { const n = its.filter((o) => o.top === g.top).length; return `<td class="c">${n || "-"}</td>`; }).join("")}<td class="c"><b>${its.length}</b></td></tr>`;
    });
    return { byGrid, html: `<table class="data matrix"><thead><tr><th>No</th>${head}${M.groups.map((g) => `<th>${esc(g.label)}</th>`).join("")}<th>Jumlah</th></tr></thead><tbody>${rows.join("")}<tr class="total"><td></td><td>Jumlah</td>${M.groups.map((g) => `<td class="c">${g.items.length}</td>`).join("")}<td class="c">${M.totals.obs}</td></tr></tbody></table>` };
  }
  function kameraTable(rows) {
    return `<table class="data kamera"><thead><tr><th>No</th><th>Kode Kamera</th><th>Tanggal Pasang</th><th>Tanggal Unduh</th><th>Hari Aktif</th><th>Foto/ Video</th><th>Satwa Terekam</th><th>Kondisi</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td class="c">${i + 1}</td><td class="c">${esc(r.kode)}</td><td class="nw">${esc(r.pasang ? nb(tglPanjang(r.pasang)) : "-")}</td><td class="nw">${esc(r.unduh ? nb(tglPanjang(r.unduh)) : "-")}</td><td class="c">${hariAktif(r) ?? "-"}</td><td class="c">${esc(r.foto || "-")}</td><td>${esc(r.satwa || "-")}</td><td class="c">${esc(r.kondisi || "-")}</td></tr>`).join("")}</tbody></table>`;
  }
  // Daftar lampiran setelah blok penutup (Memorandum, Lampiran 4)
  const lampiranIndex = (items) => `<div class="lamp-idx"><p class="lamp-head">LAMPIRAN</p><ul class="arrow">${items.map((x, i) => `<li>${esc(x)}${i === items.length - 1 ? "." : ";"}</li>`).join("")}</ul></div>`;
  const dupNote = "* Kategori, jenis, tanggal, dan koordinat sama dengan catatan lain; perlu diperiksa apakah pengamatan berbeda atau pencatatan ganda.";
  const unidNote = '"Belum ada di daftar aplikasi": jenis belum tersedia dalam daftar jenis aplikasi SMART dan tidak dihitung sebagai jenis tersendiri.';

  function renderHTML(M, profile, info, notes, maps, photoUrls, scans) {
    const I = deriveInfo(M, info, profile), t = M.totals, N = numbering(), C = faktaCtx(M, I);
    const balai = profile.balai || "Balai Taman Nasional Tambora", tglTtd = tglPanjang(I.tanggalLaporan), periodeTxt = periodeSd(I.mulai, I.selesai);
    const ketua = I.ketua || {}, penyusun = I.penyusun || {};
    const letter = (i) => String.fromCharCode(97 + i);

    const body = [kopHtml(profile), titleHtml("LAPORAN", I.judulLengkap)];
    /* 1. Pendahuluan */
    body.push(N.h1("1. Pendahuluan"), N.h2("a. Umum"), noteBlock(notes, "latar"), N.h2("b. Maksud dan Tujuan"), noteBlock(notes, "maksud"), N.h2("c. Ruang Lingkup"), noteBlock(notes, "ruanglingkup"),
      N.h2("d. Dasar"), para(`Dasar pelaksanaan kegiatan ${esc(I.judulLengkap)} adalah sebagai berikut:`), olList(dasarList(profile, I, M.members)));

    /* 2. Kegiatan yang dilaksanakan */
    const dayTable = `<table class="data"><thead><tr><th>Hari</th><th>Tanggal</th><th>Sesi Perekaman SMART</th><th>Moda</th><th>Jarak (km)</th><th>Catatan Temuan</th></tr></thead><tbody>${M.days.map((d) => `<tr><td class="c">${d.no}</td><td class="nw">${esc(nb(tglPanjang(d.date, true)))}</td><td class="c">${jam(d.start)}–${jam(d.end)}</td><td class="c">${esc(d.drone ? "Drone" : d.transport || "-")}</td><td class="r">${num(d.km, 2)}</td><td class="r">${d.nObs}</td></tr>`).join("")}<tr class="total"><td></td><td colspan="3">Total</td><td class="r">${num(t.km, 2)}</td><td class="r">${t.obs}</td></tr></tbody></table>`;
    const modesRow = M.modes.length > 1 ? para(`Rincian panjang lintasan menurut moda: ${esc(M.modes.map((m) => `${m.drone ? "penerbangan drone" : lowerVocab(m.mode)} ±${num(m.km, 2)} km`).join("; "))}. Total pada tabel merupakan penjumlahan angka harian yang telah dibulatkan.`) : "";
    const sched = [[`Penyusunan Rencana Pelaksanaan Kegiatan ${I.judul}`, addDays(I.mulai, -I.rencanaHari), addDays(I.mulai, -1)], [`Pelaksanaan Kegiatan ${I.judul}`, I.mulai, I.selesai],
      [`Pengolahan Data dan Penyusunan Laporan Kegiatan ${I.judul}`, addDays(I.selesai, 1), I.tanggalLaporan < I.selesai ? I.selesai : I.tanggalLaporan]].filter((r) => r[1] <= r[2]);
    body.push(N.h1("2. Kegiatan yang dilaksanakan"),
      N.h2("a. Keadaan Umum Lokasi Kegiatan"), noteBlock(notes, "lokasi"),
      N.h2("b. Waktu Pelaksanaan"), noteBlock(notes, "waktu"), N.cap("Rekap Sesi Perekaman Data SMART"), dayTable, modesRow,
      N.h2("c. Alat dan Bahan"), para("Alat dan bahan yang digunakan dalam kegiatan ini adalah sebagai berikut:"), N.cap("Alat dan Bahan"), alatTable(I.alat),
      N.h2("d. Metode Pelaksanaan/Metode Pengumpulan Data"), noteBlock(notes, "metode"),
      N.h2("e. Metode Analisis Data"), noteBlock(notes, "analisis"),
      N.h2("f. Tim Pelaksana"), para(`${esc(teamSentence(M.members))} Susunan tim dan peran masing-masing anggota disajikan pada tabel berikut:`),
      N.cap("Susunan dan Peran Tim Pelaksana"), teamTable(M.members, I.peranOf), para("Uraian tugas setiap peran dalam tim adalah sebagai berikut:"), olList(peranLines(M.members, I.peranOf)),
      N.h2("g. Rincian Anggaran dan Biaya"), para(`Kegiatan ini dibiayai dari ${esc(I.sumberAnggaran)}${I.nomorDipa ? ` (DIPA Nomor ${esc(I.nomorDipa)})` : ""} dengan jumlah ${esc(I.anggaran || "Rp……………")}, dengan rincian sebagai berikut:`),
      N.cap("Rincian Anggaran dan Biaya"), rabTable(I.rab, I.total),
      N.h2("h. Tata Waktu/Jadwal Pelaksanaan"), para("Tahapan dan jadwal pelaksanaan kegiatan adalah sebagai berikut:"), N.cap("Tata Waktu Pelaksanaan Kegiatan"), ganttTable(sched));

    /* 3. Hasil yang dicapai */
    body.push(N.h1("3. Hasil yang dicapai"), N.h2("a. Hasil"), noteBlock(notes, "hasil"), `<div class="blk" data-block="tabel_temuan">`);
    let fig = 0;
    M.groups.forEach((gr, gi) => {
      body.push(N.h3(`${gi + 1}) ${gr.label}`), noteBlock(notes, "hasil_" + gr.top, 3));
      const hasilPhotos = gr.items.flatMap((o) => o.photos).filter((ph) => ph.place === "hasil");
      if (hasilPhotos.length) {
        body.push(`<div class="photos">${hasilPhotos.map((ph) => { const o = ph.ob; ph.fig = ++fig; const tip = attrOf(o, "tipetemuan"); return photoFig(ph, photoUrls.get(ph.file), `Gambar ${fig}. ${esc(o.catLabel)}${tip ? " – " + esc(tip.text) : ""}${o.wp.grid ? ` di Grid ${esc(o.wp.grid)}` : ""}${o.wp.zona ? ` (${esc(o.wp.zona)})` : ""}`); }).join("")}</div>`);
      }
      body.push(N.cap(`Ringkasan Catatan ${gr.label}`), rekapTable(gr, M));
      if (gr.unidentified) body.push(`<p class="fn">${esc(unidNote)}</p>`);
    });
    const kam = kameraRows(I.facts || {});
    if (C.kamera && kam.length) body.push(N.h3(`${M.groups.length + 1}) Kamera Jebak`), para("Rekap pemasangan dan pengunduhan data kamera jebak disajikan pada tabel berikut:", 3), N.cap("Rekap Kamera Jebak"), kameraTable(kam));
    body.push(`</div>`, N.h2("b. Pembahasan"), noteBlock(notes, "pembahasan"));

    /* 4. Simpulan dan saran, 5. Penutup */
    body.push(N.h1("4. Simpulan dan saran"), N.h2("a. Simpulan"), noteBlock(notes, "kesimpulan"), N.h2("b. Saran"), noteBlock(notes, "saran"),
      N.h1("5. Penutup"), noteBlock(notes, "penutup", 1));
    body.push(closingHtml(I.kota, tglTtd, penyusun.jabatan ? `${penyusun.jabatan},` : "Ketua Tim Pelaksana,", penyusun.name, penyusun.nip));
    body.push(lampiranIndex(["Surat Tugas", "Matriks Data Hasil Kegiatan", "Matriks Analisis Data", "Peta Kerja/Peta Hasil Kegiatan", "Dokumentasi Kegiatan"]));

    /* Lampiran (Memorandum, Lampiran 4) */
    body.push(N.h1("LAMPIRAN", "front", true), N.h2("1. Surat Tugas", "lamp"));
    if ((scans || []).length) body.push(scans.map((u) => `<figure class="scan"><img src="${u}" alt="Surat Tugas"></figure>`).join(""));
    else body.push(`<p class="para placeholder noprint">Unggah scan Surat Tugas (JPG, PNG, atau PDF) di panel kiri untuk lampiran ini.</p>`);

    // Lampiran 2 dan 3 dicetak mendatar supaya tabel matriks tetap memakai huruf 11 pt
    body.push(`<div class="landscape">`, N.h2("2. Matriks Data Hasil Kegiatan", "lamp"), para("Rincian setiap catatan temuan hasil patroli SMART disajikan pada tabel berikut.", 1));
    M.groups.forEach((gr, gi) => {
      body.push(N.h3(`${letter(gi)}. ${gr.label}`), N.cap(`Matriks Data ${gr.label}`), detailTable(gr, M));
      const fn = [gr.items.some((o) => o.dup) ? dupNote : "", gr.unidentified ? unidNote : ""].filter(Boolean);
      if (fn.length) body.push(`<p class="fn">${fn.map(esc).join("<br>")}</p>`);
    });
    if (!M.groups.length) body.push(para("Tidak ada catatan temuan.", 1));

    const mx = matrixTable(M);
    body.push(N.h2("3. Matriks Analisis Data", "lamp", true),
      para(`Sebaran jumlah catatan temuan per ${mx.byGrid ? "grid patroli" : "hari"} dan kategori utama disajikan pada tabel berikut. Grid dengan jumlah catatan aktivitas manusia terbanyak menjadi prioritas tindak lanjut.`, 1),
      N.cap(`Matriks Sebaran Catatan Temuan per ${mx.byGrid ? "Grid" : "Hari"} dan Kategori`), M.groups.length ? mx.html : para("Tidak ada catatan temuan.", 1), `</div>`);

    body.push(N.h2("4. Peta Kerja/Peta Hasil Kegiatan", "lamp", true));
    let mi = 0;
    for (const gr of M.groups) {
      const m = maps.perTop && maps.perTop[gr.top];
      if (m) body.push(N.h3(`${letter(mi++)}. Peta Sebaran ${gr.label}`), `<figure class="map"><img src="${m.dataUrl}" alt=""></figure>`);
    }
    if (maps.tracking) body.push(N.h3(`${letter(mi++)}. Peta Tracking Kegiatan`), `<figure class="map" data-block="peta"><img src="${maps.tracking.dataUrl}" alt=""></figure>`);

    const kegiatan = M.photos.filter((ph) => ph.place === "kegiatan"), bio = M.photos.filter((ph) => ph.place === "biodiv");
    body.push(N.h2("5. Dokumentasi Kegiatan", "lamp", true), N.h3("a. Pelaksanaan Kegiatan"));
    if (kegiatan.length) body.push(`<div class="photos">${kegiatan.map((ph) => { const tip = attrOf(ph.ob, "tipetemuan"); return photoFig(ph, photoUrls.get(ph.file), `${esc(ph.ob.catLabel)}${tip ? " – " + esc(tip.text) : ""}`); }).join("")}</div>`);
    else body.push(para("Belum ada foto dokumentasi pelaksanaan kegiatan.", 3));
    body.push(N.h3("b. Keanekaragaman Hayati"));
    if (bio.length) body.push(`<div class="photos" data-block="foto">${bio.map((ph) => photoFig(ph, photoUrls.get(ph.file), ph.ob.species ? sci(ph.ob.species) : esc(ph.ob.catLabel))).join("")}</div>`);
    else body.push(para("Tidak ada foto keanekaragaman hayati.", 3));

    /* Sampul, lembar pengesahan, daftar isi, daftar tabel */
    const cover = coverHtml({ jenis: "LAPORAN PELAKSANAAN KEGIATAN", judul: I.judulLengkap, balai, logo: profile.logo, nomorST: I.nomorST, periode: periodeTxt, kota: I.kota, bulanTahun: bulanTahun(I.tanggalLaporan) });
    const kv = [["Judul Kegiatan", I.judulLengkap], ["Waktu Kegiatan", periodeTxt], ["Lokasi Kegiatan", `${I.lokasi}${I.gridText ? `, ${I.gridText}` : ""}`],
      ["Pelaksana", `Tim ${teamShort(M.members)}`], ["Jumlah Anggaran", I.anggaran || "Rp……………"], ["Sumber Anggaran", I.sumberAnggaran],
      ["Disusun di", I.kota || "……………"], ["Pada Tanggal", tglTtd], ["Oleh", "Tim Pelaksana Kegiatan"]];
    const peng = pengesahanHtml(profile, kv, {
      left: { head: "Menyetujui", jab: profile.kasubbagJabatan || "Kepala Subbagian Tata Usaha,", nama: profile.kasubbagNama, nip: profile.kasubbagNip },
      right: { head: "", jab: "Tim Pelaksana,", nama: ketua.name, nip: ketua.nip },
      bottom: { head: "Mengetahui", jab: profile.kepalaBalaiJabatan || "Kepala Balai,", nama: profile.kepalaBalaiNama, nip: profile.kepalaBalaiNip }
    });
    const toc = [{ lv: 1, text: "LEMBAR PENGESAHAN" }, { lv: 1, text: "DAFTAR ISI" }, { lv: 1, text: "DAFTAR TABEL" }, ...N.toc];
    return {
      html: `<section class="sec-cover">${cover}</section>\n<section class="sec-front">${peng}${tocHtml(toc, N.tables)}</section>\n<section class="sec-body">${body.join("\n")}</section>`,
      info: I
    };
  }

  window.SRGReport = { KEGIATAN, kegiatanOf, kegText, kegTeamCheck, metodeLines, alatFor, judulLengkap, buildModel, renderHTML, autoNotes, deriveInfo, readiness, periode, periodeSd, tglPanjang, num, fmtNum, hhmm, fmtNip, esc, lines, DAY_COLORS, BIODIV,
    sign, noteBlock, olList, spName, terbilang, nTxt, rupiah, rp, numVal, addDays, parseISO, inGeom, BULAN, listText, PH, fixText, sci, nb, jam, cap1, lowerVocab,
    DEFAULT_DASAR, DEFAULT_METODE, DEFAULT_ALAT, DEFAULT_RAB, DEFAULT_AKUN, DEFAULT_ALAMAT, DEFAULT_KONTAK, UNSUR, UNSUR_SHORT, UNSUR_GROUPS, MASYARAKAT, APARAT, guessUnsur, unsurGroup, unsurCount, teamSentence, teamShort, teamTable, alatTable,
    PERAN, defaultPeran, peranLines, lampiranIndex, rabRows, rabTable, terbilangRupiah, sumberAnggaran, dasarList, sortDasar, ganttTable, kopHtml, titleHtml, coverHtml, pengesahanHtml, tocHtml, closingHtml, numbering, para, bulanTahun, hasPH,
    FAKTA, KAMERA_COLS, faktaCtx, faktaShown, faktaOpts, filled, LATIN, italicLatin, KAWASAN_LAMA };
})();
