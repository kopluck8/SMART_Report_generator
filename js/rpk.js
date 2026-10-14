/*
 * Rencana Pelaksanaan Kegiatan (RPK) mengikuti contoh RPK Balai TN Tambora (ST.1167/2025):
 * sampul, lembar pengesahan berkop, daftar isi/tabel/gambar, Bab I–III, lampiran peta grid dan Surat Tugas.
 * Semua isian dari form; tidak memakai file patroli SMART.
 */
(function () {
  "use strict";
  const R = window.SRGReport;
  const { esc, lines, tglPanjang, periodeSd, terbilang, parseISO, sign, noteBlock, BULAN } = R;

  const splitGrids = (t) => [...new Set(String(t || "").split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean))];
  const listText = (arr) => arr.join(", ").replace(/, ([^,]+)$/, " dan $1");
  const rp = (n) => Math.round(n || 0).toLocaleString("id-ID");
  const numVal = (v) => Number(String(v ?? "").replace(/[^\d,]/g, "").replace(",", ".")) || 0;

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

  const DEFAULT_DASAR_RPK = [
    "Undang-Undang Nomor 5 Tahun 1990 tentang Konservasi Sumber Daya Alam Hayati dan Ekosistemnya juncto Undang-Undang Nomor 32 Tahun 2024 tentang Perubahan atas Undang-Undang Nomor 5 Tahun 1990 tentang Konservasi Sumber Daya Alam Hayati dan Ekosistemnya;",
    "Undang-Undang Nomor 41 Tahun 1999 tentang Kehutanan sebagaimana telah diubah dengan Undang-Undang Nomor 19 Tahun 2004 tentang Penetapan Peraturan Pemerintah Pengganti Undang-Undang Nomor 1 Tahun 2004 tentang Perubahan atas Undang-Undang Nomor 41 Tahun 1999 tentang Kehutanan menjadi Undang-Undang;",
    "Undang-Undang Nomor 18 Tahun 2013 tentang Pencegahan dan Pemberantasan Perusakan Hutan;",
    "Undang-Undang Nomor 6 Tahun 2023 tentang Penetapan Peraturan Pemerintah Pengganti Undang-Undang Nomor 2 Tahun 2022 tentang Cipta Kerja menjadi Undang-Undang;",
    "Peraturan Pemerintah Nomor 45 Tahun 2004 tentang Perlindungan Hutan;",
    "Peraturan Pemerintah Nomor 28 Tahun 2011 tentang Pengelolaan Kawasan Suaka Alam dan Kawasan Pelestarian Alam juncto Peraturan Pemerintah Nomor 108 Tahun 2015 tentang Perubahan atas Peraturan Pemerintah Nomor 28 Tahun 2011 tentang Pengelolaan Kawasan Suaka Alam dan Kawasan Pelestarian Alam;",
    "Peraturan Menteri Kehutanan Nomor 1 Tahun 2024 tentang Organisasi dan Tata Kerja Kementerian Kehutanan;",
    "Peraturan Menteri Kehutanan Nomor 4 Tahun 2025 tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis Direktorat Jenderal Konservasi Sumber Daya Alam dan Ekosistem;",
    "Surat Edaran Direktur Jenderal Konservasi Sumber Daya Alam dan Ekosistem Nomor SE.6/KSDAE/PKK/KSA.1/12/2022 tentang Pedoman Pelaksanaan dan Pelaporan Hasil Kegiatan Patroli di Kawasan Konservasi;",
    "Nota Kesepahaman antara Kementerian Kehutanan dan Tentara Nasional Indonesia (TNI) tentang Sinergitas Tugas dan Fungsi Kementerian Kehutanan dan Tentara Nasional Indonesia Nomor PKS.4/MENHUT/SETJEN/KUM.3/2/2025 dan Nomor NK/3/II/2025/TNI tanggal 12 Februari 2025;",
    "Nota Kesepahaman antara Kementerian Kehutanan dan Kepolisian Negara Republik Indonesia tentang Sinergitas Tugas dan Fungsi di Bidang Pembangunan Kehutanan Nomor PKS.6/MENHUT/SETJEN/KUM.3/2/2025 dan Nomor NK/7/II/2025 tanggal 17 Februari 2025;"
  ].join("\n");
  const DEFAULT_RAB = [
    { mak: "521211", jenis: "Belanja Bahan Pendukung Kegiatan", vol: "1", sat: "Keg", harga: "660000" },
    { mak: "521219", jenis: "Biaya Operasional Petugas", vol: "25", sat: "OH", harga: "360000" },
    { mak: "521219", jenis: "Biaya Operasional Tenaga Pengaman Lainnya (TNI/POLRI)", vol: "30", sat: "OH", harga: "360000" },
    { mak: "521219", jenis: "Uang Makan MPA/ Masyarakat", vol: "25", sat: "OH", harga: "35000" },
    { mak: "521219", jenis: "Uang Harian MPA/ Masyarakat", vol: "25", sat: "OH", harga: "125000" },
    { mak: "521219", jenis: "Bantuan Transportasi Petugas", vol: "25", sat: "Orang", harga: "30000" }
  ];
  const DEFAULT_AKUN = "7273.REA.002.051.A.521219 (PNP)";

  function centroid(f) { const b = f._bbox; return b ? [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2] : null; }
  function valueAt(layer, x, y) {
    if (!layer) return "";
    for (const f of layer.features) {
      if (f._bbox && (x < f._bbox[0] || x > f._bbox[2] || y < f._bbox[1] || y > f._bbox[3])) continue;
      if (R.inGeom(x, y, f.geometry)) return String(f.properties?.[layer.field] ?? "").trim();
    }
    return "";
  }

  /* ---------- Model ---------- */
  // info: isian form; team: [{nama, nip, pangkat, jabatan, rank, koordinator}]; rab: baris anggaran
  function build(info, profile, team, rab, layers, ppk) {
    const today = new Date().toISOString().substr(0, 10);
    const mulai = info.tglMulai || "", selesai = info.tglSelesai && info.tglSelesai >= mulai ? info.tglSelesai : mulai;
    const year = (mulai || info.tanggalST || today).substr(0, 4);
    const dipa = (window.SRG_DIPA || {})[year] || {};
    const ba = ((dipa.nomor || "").match(/DIPA-?(\d+)/i) || [])[1] || "143";
    const akun = (info.akun || DEFAULT_AKUN).trim();
    const judul = (info.judul || "").trim(), lokasi = (info.lokasi || "").trim();
    const grids = splitGrids(info.grids);
    const gridLayer = layers.find((l) => l.role === "grid"), zonaLayer = layers.find((l) => l.role === "zonasi"), resortLayer = layers.find((l) => l.role === "resort");
    const gridFeatures = [], gridInfo = [], notFound = [];
    for (const g of grids) {
      const f = gridLayer && gridLayer.features.find((x) => String(x.properties?.[gridLayer.field] ?? "").trim() === g);
      if (!f) { notFound.push(g); continue; }
      gridFeatures.push(f);
      const c = centroid(f);
      gridInfo.push({ grid: g, zona: c ? valueAt(zonaLayer, c[0], c[1]) : "", resort: c ? valueAt(resortLayer, c[0], c[1]).replace(/^resor[t]?\s+/i, "") : "" });
    }
    const uniq = (a) => [...new Set(a.filter(Boolean))];
    const members = [...team].sort((a, b) => a.rank - b.rank);
    const rows = rab.filter((r) => (r.jenis || "").trim()).map((r) => ({ ...r, total: numVal(r.vol) * numVal(r.harga) }));
    const total = rows.reduce((s, r) => s + r.total, 0);
    return {
      judul: judul || "……………", lokasi: lokasi || "……………", nomorST: (info.nomorST || "").trim(), tanggalST: info.tanggalST || "", mulai, selesai,
      hari: mulai ? Math.round((parseISO(selesai) - parseISO(mulai)) / 864e5) + 1 : 0, year, akun,
      nomorDipa: dipa.nomor || "", tanggalDipa: dipa.tanggal || "",
      sumberAnggaran: `DIPA BA. ${ba} Balai Taman Nasional Tambora Tahun Anggaran ${year}, Akun ${akun}`,
      rab: rows, total, anggaran: total ? `Rp.${rp(total)},-` : "",
      kota: info.tempatTtd || profile.kota || "", tanggalTtd: info.tanggalTtd || today,
      grids, gridFeatures, gridInfo, notFound, zonas: uniq(gridInfo.map((g) => g.zona)), resorts: uniq(gridInfo.map((g) => g.resort)),
      gridText: grids.length ? `Grid ${listText(grids)}` : "", members, koordinator: members.find((m) => m.koordinator) || null, ppk: ppk || null
    };
  }

  /* ---------- Narasi (bisa diedit di halaman) ---------- */
  function autoNotes(I) {
    const J = `${I.judul} di Kawasan Taman Nasional Tambora`;
    const tgl = I.mulai ? periodeSd(I.mulai, I.selesai) : "……………";
    const zona = I.zonas.length ? ` (${listText(I.zonas)}${I.resorts.length ? `, Resor ${listText(I.resorts)}` : ""})` : "";
    return {
      latar: [
        "Kawasan Taman Nasional Tambora adalah bagian dari Kawasan Pelestarian Alam dengan sistem zonasi untuk tujuan penelitian, pendidikan, ilmu pengetahuan, budidaya, pariwisata dan rekreasi. Berdasarkan SK Menteri Lingkungan Hidup dan Kehutanan Republik Indonesia No.SK.111/Menlhk-II/2015 Tanggal 27 April 2015 telah ditunjuk sebagai kawasan Taman Nasional dengan luas wilayah 71.645,64 hektar.",
        "Secara administratif kawasan Taman Nasional Tambora masuk dalam pemerintahan Kabupaten Bima dan Kabupaten Dompu Provinsi Nusa Tenggara Barat. Kawasan Taman Nasional Tambora merupakan kawasan pegunungan (gunung berapi). Dalam upaya menjaga kelestarian kawasan Taman Nasional Tambora masih sangat banyak permasalahan yang dihadapi, hal ini disebabkan oleh beberapa faktor antara lain: kemampuan ekonomi yang belum merata, pendapatan masyarakat masih sangat rendah, jumlah penduduk yang semakin bertambah sedangkan lapangan pekerjaan semakin sulit ditambah lagi dengan tingkat pendidikan sebagian besar masyarakat yang masih rendah, sehingga mengakibatkan gangguan terhadap kawasan Taman Nasional Tambora cenderung meningkat karena ketergantungan masyarakat terhadap kawasan hutan yang cukup tinggi.",
        "Permasalahan yang dihadapi di kawasan Taman Nasional Tambora antara lain: perambahan kawasan hutan untuk keperluan perladangan, penebangan kayu secara ilegal, perburuan liar, penguasaan kawasan untuk lahan perkebunan dan penangkapan/pengambilan satwa yang dilindungi serta kebakaran hutan dan lahan. Guna memastikan fungsi perlindungan, pelestarian, dan pemanfaatan terhadap aspek lingkungan, ekonomi, dan sosial budaya masyarakat dalam kawasan dapat berjalan dengan baik, maka perlu adanya perlindungan dan pengamanan kawasan dari Balai Taman Nasional Tambora selaku pengelola kawasan.",
        "Upaya pelestarian Taman Nasional Tambora sebagai salah satu kawasan konservasi yang penting di Indonesia saat ini masih menghadapi berbagai tantangan yang berat dan kompleks. Meskipun telah ada peraturan dalam pengelolaannya, baik perlindungan dan pengamanan maupun pemanfaatannya, namun ancaman terhadap keutuhan kawasan masih terjadi, seperti perburuan, penebangan pohon (illegal logging), perambahan, alih fungsi lahan dan lain-lain.",
        "Polisi Kehutanan merupakan pejabat fungsional yang mempunyai tugas pokok menyiapkan, melaksanakan, mengembangkan, memantau, dan mengevaluasi serta melaporkan kegiatan perlindungan dan pengamanan hutan serta pengawasan peredaran hasil hutan. Patroli merupakan salah satu wewenang yang dapat dilakukan oleh Polisi Kehutanan guna mencegah dan menanggulangi permasalahan-permasalahan yang menyangkut perlindungan dan pengamanan kawasan hutan.",
        `Oleh karena itu, akan dilaksanakan kegiatan ${J} pada tanggal ${tgl}${I.gridText ? ` yang difokuskan pada ${I.gridText}` : ""}, dengan pengambilan data menggunakan metode Spatial Monitoring and Reporting Tool (SMART).`
      ].join("\n"),
      maksud: [
        `Maksud dari kegiatan ${J} dalam rangka pengamanan hutan ini adalah sebagai langkah preventif yang lebih spesifik pada pengamanan dan perlindungan kawasan Taman Nasional Tambora terhadap permasalahan-permasalahan yang muncul seperti perambahan hutan, illegal logging, perburuan liar, kebakaran hutan dan lahan serta lain-lain.`,
        `Sedangkan tujuan kegiatan ${J} dalam rangka pengamanan hutan ini adalah agar kegiatan dapat dilaksanakan secara cepat, tepat, efektif, sesuai dengan tujuan dan sasarannya sehingga kegiatan ini dapat melakukan:`,
        "1. Tindakan-tindakan hukum perlindungan dan pengawasan yang terfokus untuk permasalahan-permasalahan yang ada.",
        "2. Meniadakan niat dan kesempatan orang untuk melakukan aktivitas gangguan kawasan hutan.",
        "3. Meminimalisir terjadinya gangguan di dalam kawasan Taman Nasional Tambora.",
        "4. Menghadirkan petugas di lapangan untuk memelihara keamanan kawasan hutan.",
        "5. Meningkatkan peran serta dan partisipasi masyarakat dalam mewujudkan pengamanan kawasan hutan."
      ].join("\n"),
      ruanglingkup: `Ruang lingkup kegiatan ${J} ini adalah pelaksanaan perlindungan dan pengamanan kawasan dari gangguan dengan menerapkan prinsip pre-emtif dan preventif dalam pelaksanaannya. Kegiatan akan dilaksanakan dengan melakukan penyisiran dan pengecekan kondisi kawasan${I.gridText ? ` pada ${I.gridText}${zona}` : ""} sehingga menghilangkan niat dari pelaku TIPIHUT dan memastikan kawasan dalam keadaan aman dari TIPIHUT. Kegiatan akan diiringi dengan pengambilan data SMART Patrol yang terdiri dari data potensi gangguan dan potensi kawasan.`,
      target: `Kegiatan ${I.judul} dalam rangka pengamanan hutan ini mendukung capaian target IKK yaitu satu unit kawasan konservasi yang ditingkatkan efektivitas pengelolaannya. Kegiatan patroli sebaiknya mencakup sebagian kawasan yang dilaksanakan secara bergiliran di seluruh kawasan konservasi baik secara teratur, acak maupun insidentil. Jarak tempuh atau cakupan luasan disesuaikan dengan kondisi lapangan karena sangat berpengaruh terhadap kecepatan dan kemampuan pelaksana, ketersediaan sarana dan prasarana transportasi, atau kemampuan berjalan dalam waktu yang sama. Target minimal kegiatan ini adalah melakukan patroli rimba sepanjang minimal 3 grid/kegiatan di dalam kawasan dengan penghitungan capaian output menggunakan grid patroli 1 km x 1 km yang dikalkulasi dalam hektar dengan pengecualian situasi tertentu.${I.grids.length ? ` Pada kegiatan ini direncanakan ${I.grids.length} (${terbilang(I.grids.length)}) grid, yaitu ${I.gridText}.` : ""}`,
      waktu: `Kegiatan ${J} ini akan dilaksanakan selama ${I.hari || "…"} (${I.hari ? terbilang(I.hari) : "…"}) hari terhitung mulai tanggal ${tgl}. Tempat pelaksanaan kegiatan berlokasi di Wilayah Kerja ${I.lokasi}${I.gridText ? `, meliputi ${I.gridText}${zona}` : ""}.`,
      alat: [
        `Pelaksanaan Kegiatan ${J} akan menggunakan bahan serta peralatan sebagai berikut:`,
        "1. Peta Kerja Kawasan Taman Nasional Tambora",
        "2. Alat Komunikasi",
        "3. Smartphone (HP) yang sudah terinstal kamera, aplikasi SMART Mobile, dan aplikasi peta digital",
        "4. Alat Tulis Kantor (ATK)",
        "5. Karung (Trash Bag)",
        "6. Serta alat dan bahan penunjang kegiatan lainnya."
      ].join("\n"),
      metode: [
        `Pelaksanaan Kegiatan ${J} akan dilaksanakan berdasarkan Surat Edaran Direktur Jenderal Konservasi Sumber Daya Alam dan Ekosistem Nomor SE.6/KSDAE/PKK/KSA.1/12/2022 tentang Pedoman Pelaksanaan dan Pelaporan Hasil Kegiatan Patroli di Kawasan Konservasi, yang dirangkum sebagai berikut:`,
        "1. Perencanaan",
        "Perencanaan dalam bentuk program kerja operasional dibuat secara berjenjang. Perencanaan kegiatan berisi perkiraan hal-hal yang dibutuhkan seperti personil, logistik/transportasi, sasaran/target/tempat tujuan, alat dan bahan, serta penentuan cara bertindak (penyuluhan, pre-emtif, preventif).",
        "2. Pelaksanaan SMART Patrol",
        "a. Patroli akan dilaksanakan dengan berjalan kaki dan menggunakan transportasi darat bersama personel TNI/Polri serta masyarakat.",
        "b. Mencatat atau mendata titik koordinat temuan.",
        "c. Mencatat kondisi umum lokasi patroli dan mendokumentasikannya.",
        "d. Menyisir lokasi yang dianggap rawan siang dan malam.",
        "e. Apabila saat pelaksanaan kegiatan ditemukan kejadian tertangkap tangan melakukan tindakan illegal logging di dalam kawasan, petugas wajib mengamankan pelaku (menangkap, memeriksa, mengamankan barang bukti, dan melakukan pemeriksaan awal TKP).",
        "f. Mencatat data potensi kawasan.",
        "g. Mencatat data kerawanan kebakaran hutan dan lahan (Karhutla).",
        "h. Masyarakat Mitra Polhut (MMP)/Masyarakat Peduli Api (MPA)/masyarakat membantu petugas dalam melaksanakan kegiatan patroli.",
        "3. Pelaporan",
        "Pelaporan akan dibuat setelah kegiatan patroli dilaksanakan sebagai bentuk pertanggungjawaban, paling lambat 7 hari setelah pelaksanaan kegiatan."
      ].join("\n"),
      penutup: [
        "Demikian penyusunan Rencana Pelaksanaan Kegiatan (RPK) ini dibuat sebagai acuan/pedoman standarisasi penyelenggaraan kegiatan sesuai dengan aturan, juklak dan juknis yang telah ditetapkan untuk mencapai tujuan yang diharapkan.",
        `Dalam penyusunan Rencana Pelaksanaan Kegiatan (RPK) ${J} ini mengacu pada format dan kebutuhan penyusunan Rencana Pelaksanaan Kegiatan (RPK) yang berlaku, namun demikian kami sangat membutuhkan masukan dan saran dari semua pihak dalam perbaikan Rencana Pelaksanaan Kegiatan (RPK) ini.`
      ].join("\n")
    };
  }

  /* ---------- Kesiapan ---------- */
  function readiness(I, info, profile, scans) {
    return [
      { label: "Judul kegiatan", ok: !!(info.judul || "").trim() },
      { label: "Lokasi (wilayah kerja)", ok: !!(info.lokasi || "").trim() },
      { label: "Nomor dan tanggal Surat Tugas", ok: !!(I.nomorST && I.tanggalST) },
      { label: "Tanggal pelaksanaan", ok: !!(info.tglMulai && info.tglSelesai), note: I.mulai ? periodeSd(I.mulai, I.selesai) : "" },
      { label: `DIPA TA.${I.year}`, ok: !!I.nomorDipa, note: I.nomorDipa || "belum ada di data/dipa.json" },
      { label: "Rincian anggaran", ok: I.total > 0, note: I.anggaran },
      { label: "Tim pelaksana dan koordinator", ok: I.members.length > 0 && !!I.koordinator, note: `${I.members.length} orang${I.koordinator ? "" : ", koordinator belum dipilih"}` },
      { label: "Pejabat Pembuat Komitmen", ok: !!I.ppk, note: I.ppk ? I.ppk.nama : "" },
      { label: "Kepala Balai", ok: !!profile.kepalaBalaiNama },
      { label: "Grid rencana", ok: I.gridFeatures.length > 0 && !I.notFound.length, note: I.notFound.length ? `tidak ditemukan: ${I.notFound.join(", ")}` : I.grids.join(", ") },
      { label: "Tempat dan tanggal penyusunan", ok: !!info.tanggalTtd, note: `${I.kota || "…"}, ${tglPanjang(I.tanggalTtd)}${info.tanggalTtd ? "" : " (sementara)"}` },
      { label: "Scan Surat Tugas", ok: scans.length > 0, note: scans.length ? `${scans.length} halaman` : "" },
      { label: "Narasi sudah diperiksa", ok: !!info.narasiOk, note: "centang setelah teks diperiksa" }
    ];
  }

  /* ---------- HTML ---------- */
  function render(I, profile, notes, map) {
    const toc = [];
    const h1 = (txt, id, pb = true) => { toc.push({ lvl: 1, txt: txt.replace(/<br>/g, " ") }); return `<h1 class="${pb ? "pb" : ""}" id="${id}">${txt}</h1>`; };
    const h2 = (txt) => { toc.push({ lvl: 2, txt }); return `<h2>${esc(txt)}</h2>`; };
    const balai = profile.balai || "Balai Taman Nasional Tambora";
    const periodeTxt = I.mulai ? periodeSd(I.mulai, I.selesai) : "……………";
    const bulanTahun = (() => { const d = parseISO(I.tanggalTtd); return `${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`; })();
    const J = `${I.judul} di Kawasan Taman Nasional Tambora`;

    const front = [];
    front.push(`<div class="cover">
      <p class="cv-title">RENCANA PELAKSANAAN KEGIATAN<br>${esc(I.judul.toUpperCase())}<br>DI KAWASAN ${esc(balai.replace(/^Balai\s+/i, "").toUpperCase())}</p>
      ${profile.logo ? `<img class="cv-logo" src="${profile.logo}" alt="">` : `<div class="cv-logo nologo">Logo Balai</div>`}
      <p class="cv-by">OLEH:<br>TIM PELAKSANA KEGIATAN</p>
      <p class="cv-place">${esc((I.kota || "………").toUpperCase())}, ${esc(bulanTahun.toUpperCase())}</p></div>`);

    const kop = `<div class="kop pb">${window.SRG_KOP_LOGO ? `<img src="${window.SRG_KOP_LOGO}" alt="">` : ""}<div class="kop-t"><div>KEMENTERIAN KEHUTANAN</div><div>DIREKTORAT JENDERAL KONSERVASI SUMBER DAYA ALAM DAN EKOSISTEM</div><div class="big">${esc(balai.toUpperCase())}</div></div></div>`;
    toc.push({ lvl: 1, txt: "LEMBAR PENGESAHAN" });
    const kv = [
      ["Judul Kegiatan", `${I.judul} di Wilayah Taman Nasional Tambora`], ["Waktu Kegiatan", periodeTxt], ["Lokasi Kegiatan", `Wilayah Kerja ${I.lokasi}`],
      ["Jumlah Anggaran", I.anggaran || "Rp. ……………"], ["Sumber Anggaran", I.sumberAnggaran], ["Disusun di", I.kota || "……………"],
      ["Pada Tanggal", tglPanjang(I.tanggalTtd)], ["Oleh", "Tim Pelaksana"]
    ];
    front.push(kop, `<h1 class="ctr" id="pengesahan">LEMBAR PENGESAHAN</h1>
      <table class="kv-plain">${kv.map(([k, v]) => `<tr><td>${esc(k)}</td><td>:</td><td>${esc(v)}</td></tr>`).join("")}</table>
      <table class="sign"><tr><td>${sign(["Diperiksa dan Disetujui,", "Pejabat Pembuat Komitmen"], I.ppk && I.ppk.nama, I.ppk && I.ppk.nip)}</td>
      <td>${sign(["", "Koordinator Kegiatan"], I.koordinator && I.koordinator.nama, I.koordinator && I.koordinator.nip)}</td></tr>
      <tr><td colspan="2">${sign(["Mengesahkan,", "Kepala " + balai], profile.kepalaBalaiNama, profile.kepalaBalaiNip)}</td></tr></table>`);

    const body = [];
    body.push(h1("BAB I<br>PENDAHULUAN", "bab1"), h2("A. Latar Belakang"), noteBlock(notes, "latar"), h2("B. Maksud dan Tujuan"), noteBlock(notes, "maksud"),
      h2("C. Ruang Lingkup Kegiatan"), noteBlock(notes, "ruanglingkup"), h2("D. Target dan Output Kegiatan"), noteBlock(notes, "target"));

    const dasar = lines(profile.dasarHukumRpk || DEFAULT_DASAR_RPK);
    if (I.nomorDipa) dasar.push(`Pengesahan Daftar Isian Pelaksanaan Anggaran Tahun Anggaran ${I.year} Nomor ${I.nomorDipa}${I.tanggalDipa ? ` tanggal ${tglPanjang(I.tanggalDipa)}` : ""};`);
    dasar.push(`Surat Tugas Kepala ${balai} Nomor ${I.nomorST || "……………"}${I.tanggalST ? ` tanggal ${tglPanjang(I.tanggalST)}` : ""}.`);
    body.push(h1("BAB II<br>RENCANA PELAKSANAAN", "bab2"), h2("A. Dasar Hukum"),
      `<p class="para">Adapun dasar hukum pelaksanaan Kegiatan ${esc(J)} ini adalah sebagai berikut:</p>`,
      `<ol class="list">${dasar.map((d) => `<li>${esc(d.replace(/^\d+[.)]\s*/, ""))}</li>`).join("")}</ol>`,
      h2("B. Waktu dan Tempat Pelaksanaan Kegiatan"), noteBlock(notes, "waktu"),
      h2("C. Alat dan Bahan"), noteBlock(notes, "alat"),
      h2("D. Metode"), noteBlock(notes, "metode"),
      h2("E. Tim Pelaksana Kegiatan"),
      `<p class="para">Tim pelaksana Kegiatan ${esc(J)} terdiri dari ${I.members.length} (${terbilang(I.members.length) || "nol"}) orang sebagaimana tercantum dalam tabel berikut:</p>`,
      `<p class="cap">Tabel 1 Nama Pelaksana Kegiatan</p>`,
      `<table class="data" data-block="tabel_anggota"><thead><tr><th>No</th><th>Nama/ NIP/ NRP</th><th>Pangkat/ Golongan</th><th>Jabatan</th></tr></thead><tbody>${I.members.map((m, i) => `<tr><td class="c">${i + 1}</td><td>${esc(m.nama)}/<br>${esc(m.nip ? R.fmtNip(m.nip) : "-")}</td><td>${esc(m.pangkat || "-")}</td><td>${esc(m.jabatan || "-")}</td></tr>`).join("") || `<tr><td colspan="4" class="c">Pilih anggota tim di panel kiri.</td></tr>`}</tbody></table>`,
      h2("F. Rincian Anggaran dan Biaya"),
      `<p class="para">Adapun Rincian Anggaran dan Biaya Pelaksanaan Kegiatan ${esc(J)} ini dibiayai dari Daftar Isian Pelaksanaan Anggaran (DIPA) ${esc(balai)} Tahun Anggaran ${esc(I.year)}${I.nomorDipa ? ` dengan Nomor ${esc(I.nomorDipa)} tanggal ${esc(tglPanjang(I.tanggalDipa))}` : ""} akun ${esc(I.akun)} dengan rincian tertuang dalam tabel berikut:</p>`,
      `<p class="cap">Tabel 2 Rincian Anggaran dan Biaya Kegiatan</p>`);
    let no = 0, lastMak = null;
    body.push(`<table class="data rab"><thead><tr><th>No</th><th>MAK</th><th>Jenis</th><th>Jumlah</th><th>Satuan (Rp)</th><th>Total (Rp)</th></tr></thead><tbody>${I.rab.map((r) => {
      const first = r.mak !== lastMak; lastMak = r.mak; if (first) no++;
      return `<tr><td class="c">${first ? no : ""}</td><td class="c">${first ? esc(r.mak) : ""}</td><td>${esc(r.jenis)}</td><td class="c">${esc(r.vol)} ${esc(r.sat)}</td><td class="r">${rp(numVal(r.harga))}</td><td class="r">${rp(r.total)}</td></tr>`;
    }).join("")}<tr class="total"><td colspan="5">Total</td><td class="r">${rp(I.total)}</td></tr><tr><td colspan="6"><i>Terbilang : ${esc(terbilangRupiah(I.total))}</i></td></tr></tbody></table>`);

    body.push(h1("BAB III<br>PENUTUP", "bab3"), noteBlock(notes, "penutup"));

    toc.push({ lvl: 1, txt: "LAMPIRAN" });
    body.push(`<h1 class="pb" id="lampiran">LAMPIRAN</h1>`);
    if (map) body.push(`<figure class="map" data-block="peta"><img src="${map.dataUrl}" alt=""></figure>`, `<p class="cap">Gambar 1 Peta Rencana Smart Patrol Berbasis Grid</p>`);
    else body.push(`<p class="para placeholder">Isi nomor grid rencana untuk membuat peta.</p>`);
    body.push(`<h2 class="lamp pb">Surat Tugas</h2>`);
    if ((I.scans || []).length) body.push(I.scans.map((u) => `<figure class="scan"><img src="${u}" alt="Surat Tugas"></figure>`).join(""));
    else body.push(`<p class="para placeholder">Unggah scan Surat Tugas (JPG, PNG, atau PDF).</p>`);

    toc.splice(1, 0, { lvl: 1, txt: "DAFTAR ISI" });
    const tocHtml = `<h1 class="pb ctr" id="daftarisi">DAFTAR ISI</h1><div class="toc">${toc.map((x) => `<div class="toc-${x.lvl}">${esc(x.txt)}</div>`).join("")}</div>
      <p class="cap">DAFTAR TABEL</p><p class="li">Tabel 1 Nama Pelaksana Kegiatan</p><p class="li">Tabel 2 Rincian Anggaran dan Biaya Kegiatan</p>
      <p class="cap">DAFTAR GAMBAR</p><p class="li">Gambar 1 Peta Rencana Smart Patrol Berbasis Grid</p>`;
    return `<section class="sec-front">${front.join("\n")}${tocHtml}</section>\n<section class="sec-body">${body.join("\n")}</section>`;
  }

  window.SRGRpk = { build, autoNotes, readiness, render, splitGrids, terbilangRupiah, DEFAULT_RAB, DEFAULT_AKUN, DEFAULT_DASAR_RPK, numVal, rp };
})();
