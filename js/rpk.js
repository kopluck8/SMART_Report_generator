/*
 * Rencana Pelaksanaan Kegiatan (RPK), susunan mengikuti Memorandum M.57/T.41/TU/PEG/02/2026 seperti LPK:
 * sampul, lembar pengesahan (PPK, Koordinator Kegiatan, Kepala Balai), daftar isi dan daftar tabel, lalu
 * kop, RENCANA PELAKSANAAN KEGIATAN / TENTANG / judul, 1. Pendahuluan, 2. Kegiatan yang akan dilaksanakan, 3. Penutup,
 * dan lampiran Surat Tugas serta peta kerja. Semua isian dari form; tidak memakai file patroli SMART.
 * Keadaan umum lokasi disusun dari wilayah kerja (SPTN/resor) yang dipilih atau ditebak dari grid rencana.
 */
(function () {
  "use strict";
  const R = window.SRGReport;
  const { esc, tglPanjang, periodeSd, parseISO, noteBlock, nTxt, listText, addDays, numbering, para, olList, cap1 } = R;
  const WIL = () => (window.SRGWilayah && window.SRGWilayah.data.sptn.length ? window.SRGWilayah : null);

  const splitGrids = (t) => [...new Set(String(t || "").split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean))];

  function centroid(f) { const b = f._bbox; return b ? [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2] : null; }
  // Titik contoh 5 x 5 di dalam kotak grid: grid di tepi kawasan yang pusatnya jatuh di luar tetap mendapat zona/resor terbanyak
  function samplePts(f) {
    const b = f._bbox, pts = [];
    if (!b) return pts;
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) pts.push([b[0] + ((b[2] - b[0]) * (i + 0.5)) / 5, b[1] + ((b[3] - b[1]) * (j + 0.5)) / 5]);
    return pts;
  }
  function majority(items, key) {
    const c = new Map();
    for (const it of items) { const k = key(it); if (k) { const e = c.get(k) || { n: 0, it }; e.n++; c.set(k, e); } }
    let best = null;
    for (const e of c.values()) if (!best || e.n > best.n) best = e;
    return best ? best.it : null;
  }
  function valueAt(layer, x, y) {
    if (!layer) return "";
    for (const f of layer.features) {
      if (f._bbox && (x < f._bbox[0] || x > f._bbox[2] || y < f._bbox[1] || y > f._bbox[3])) continue;
      if (R.inGeom(x, y, f.geometry)) return String(f.properties?.[layer.field] ?? "").trim();
    }
    return "";
  }

  /* ---------- Model ---------- */
  // info: isian form; team: [{nama, nip, pangkat, jabatan, unsur, rank, koordinator, peran}]; rab, alat: baris tabel
  function build(info, profile, team, rab, layers, ppk, alat) {
    const today = new Date().toISOString().substr(0, 10);
    const mulai = info.tglMulai || "", selesai = info.tglSelesai && info.tglSelesai >= mulai ? info.tglSelesai : mulai;
    const year = (mulai || info.tanggalST || today).substr(0, 4);
    const dipa = (window.SRG_DIPA || {})[year] || {};
    const akun = (info.akun || R.DEFAULT_AKUN).trim();
    const judul = (info.judul || "").trim();
    const grids = splitGrids(info.grids), Wl = WIL();
    const gridLayer = layers.find((l) => l.role === "grid"), zonaLayer = layers.find((l) => l.role === "zonasi"), resortLayer = layers.find((l) => l.role === "resort");
    const gridFeatures = [], gridInfo = [], notFound = [], centers = [];
    for (const g of grids) {
      const f = gridLayer && gridLayer.features.find((x) => String(x.properties?.[gridLayer.field] ?? "").trim() === g);
      if (!f) { notFound.push(g); continue; }
      gridFeatures.push(f);
      const c = centroid(f), pts = c ? [c, ...samplePts(f)] : [];
      // Resor menurut batas wilayah kerja 2026 (Satu Data Tambora); lapisan resor peta dipakai bila batas 2026 tidak tersedia
      const hit26 = Wl ? majority(pts.map((p) => ({ p, r: Wl.resorAt(p[0], p[1]) })), (x) => x.r && x.r.nama) : null;
      const r26 = hit26 ? hit26.r : null, s26 = r26 ? Wl.resolve("sptn:" + r26.sptn) : null;
      if (c) centers.push(hit26 ? hit26.p : c);
      const zona = majority(pts.map((p) => valueAt(zonaLayer, p[0], p[1])), (z) => z) || "";
      const resLama = r26 ? "" : majority(pts.map((p) => valueAt(resortLayer, p[0], p[1])), (z) => z) || "";
      gridInfo.push({ grid: g, zona, resort: r26 ? r26.nama : resLama.replace(/^resor[t]?\s+/i, ""), sptn: s26 ? s26.nama : "" });
    }
    // Wilayah kerja: pilihan form, isian lokasi lama (teks), lalu tebakan dari pusat grid rencana
    const auto = Wl && centers.length ? Wl.detect(centers) : null;
    const chosen = info.wilayah || "";
    const W = Wl ? Wl.resolve(chosen || Wl.fromText(info.lokasi) || (auto ? auto.v : "")) : null;
    const lokasi = W ? W.lokasi : (info.lokasi || "").trim();
    const uniq = (a) => [...new Set(a.filter(Boolean))];
    const members = team.map((m) => ({ ...m, name: m.nama, unsur: m.unsur || "masyarakat" })).sort((a, b) => R.unsurGroup(a.unsur) - R.unsurGroup(b.unsur) || a.rank - b.rank);
    const rows = R.rabRows(rab), total = rows.reduce((s, r) => s + r.total, 0);
    const keg = R.kegiatanOf(judul), fire = /kebakaran|karhut|\bapi\b/i.test(judul) || !!(keg || {}).fire;
    return {
      judul: judul || "……………", lokasi: lokasi || "……………", judulLengkap: R.judulLengkap(judul || "……………", lokasi), W, wilayahAuto: !chosen, auto, share: auto ? auto.counts : [],
      nomorST: (info.nomorST || "").trim(), tanggalST: info.tanggalST || "", mulai, selesai,
      hari: mulai ? Math.round((parseISO(selesai) - parseISO(mulai)) / 864e5) + 1 : 0, year, akun,
      nomorDipa: dipa.nomor || "", tanggalDipa: dipa.tanggal || "", sumberAnggaran: R.sumberAnggaran(year, akun),
      rab: rows, total, anggaran: R.rupiah(total), alat: alat || R.alatFor(keg),
      kota: info.tempatTtd || profile.kota || "", tanggalTtd: info.tanggalTtd || today,
      grids, gridFeatures, gridInfo, notFound, zonas: uniq(gridInfo.map((g) => g.zona)), resorts: uniq(gridInfo.map((g) => g.resort)),
      gridText: grids.length ? `Grid ${listText(grids)}` : "", members, koordinator: members.find((m) => m.koordinator) || null, ppk: ppk || null,
      keg, fire, metodeText: profile.metode,
      peranOf: (m) => m.peran || R.defaultPeran(m, { fire })
    };
  }

  /* ---------- Narasi (disusun otomatis; tetap bisa diedit di halaman) ---------- */
  function autoNotes(I) {
    const Wl = WIL(), W = I.W, K = I.keg, J = I.judulLengkap;
    const tgl = I.mulai ? periodeSd(I.mulai, I.selesai) : "……………";
    const kt = (x) => R.kegText(x, true, I.members), num1 = (a) => a.map((x, i) => `${i + 1}. ${kt(x)}`);
    const kajian = Wl ? Wl.kajian() : "";
    const zonaTxt = listText(I.zonas.map((z) => "zona " + R.lowerVocab(z.replace(/^zona\s+/i, ""))));
    const tujuan = K && K.tujuan ? num1(K.tujuan) : I.fire ? [
      "1. Mendeteksi secara dini indikasi kebakaran hutan dan lahan, termasuk titik api aktif dan bekas terbakar;",
      "2. Memantau lokasi rawan kebakaran serta aktivitas manusia yang berpotensi menjadi sumber api;",
      "3. Melakukan tindakan awal dan melaporkan api aktif yang ditemukan untuk ditindaklanjuti;",
      "4. Mengumpulkan data kondisi tutupan lahan, sumber air, serta sarana prasarana dan batas kawasan;",
      "5. Meningkatkan peran serta masyarakat dalam pencegahan kebakaran hutan dan lahan."
    ] : [
      "1. Melakukan tindakan perlindungan dan pengawasan yang terfokus pada permasalahan yang ada;",
      "2. Meniadakan niat dan kesempatan orang untuk melakukan aktivitas gangguan kawasan hutan;",
      "3. Meminimalkan terjadinya gangguan di dalam kawasan Taman Nasional Tambora;",
      "4. Menghadirkan petugas di lapangan untuk memelihara keamanan kawasan hutan;",
      "5. Meningkatkan peran serta dan partisipasi masyarakat dalam pengamanan kawasan hutan."
    ];
    const ruang = (K && K.ruang ? K.ruang.map(kt) : [
      `Pelacakan dan pendataan indikasi aktivitas manusia${I.fire ? " dan indikasi kebakaran" : ""} di dalam kawasan;`,
      "Pengamatan kondisi tutupan hutan, keberadaan satwa liar dan tumbuhan, serta potensi titik api;",
      "Imbauan kepada masyarakat yang ditemukan beraktivitas di dalam kawasan;",
      "Pencatatan data lapangan menggunakan aplikasi SMART Mobile, termasuk titik koordinat dan dokumentasi visual temuan."
    ]).map((x) => x.replace(/[;.]\s*$/, ";"));
    const tahap = [];
    if (I.mulai) {
      const p0 = I.tanggalTtd < I.mulai ? I.tanggalTtd : addDays(I.mulai, -1);
      tahap.push(`persiapan, berupa penyusunan rencana pelaksanaan kegiatan dan pemeriksaan peralatan, pada ${periodeSd(p0, addDays(I.mulai, -1))}`);
      tahap.push(`pelaksanaan patroli dan pengambilan data di lapangan pada ${periodeSd(I.mulai, I.selesai)}`);
      tahap.push(`pengolahan data dan penyusunan laporan pada ${periodeSd(addDays(I.selesai, 1), addDays(I.selesai, 7))}`);
    }
    const wilayahNama = W ? (W.type === "resor" ? `${W.nama}, ${W.sptn.nama}` : W.nama) : I.lokasi;
    return {
      latar: [
        ...(Wl && Wl.data.kawasan ? Wl.kawasanParas() : [R.KAWASAN_LAMA]),
        K && K.konteks ? kt(K.konteks) : "",
        Wl ? Wl.wilayahPara(W) : "",
        `Oleh karena itu, akan dilaksanakan kegiatan ${J} pada tanggal ${tgl}${I.gridText ? ` yang difokuskan pada ${I.gridText}` : ""}, dengan pengambilan data menggunakan metode Spatial Monitoring and Reporting Tool (SMART).`
      ].filter(Boolean).join("\n"),
      maksud: [
        `Kegiatan ${J} dimaksudkan sebagai upaya ${K && K.maksud ? K.maksud : `${I.fire ? "pencegahan kebakaran hutan dan lahan serta " : ""}pengamanan dan perlindungan kawasan Taman Nasional Tambora terhadap gangguan seperti perambahan, pembalakan liar, perburuan satwa, serta kebakaran hutan dan lahan`}${I.gridText ? `, khususnya pada ${I.gridText}` : ""}.`,
        "Adapun tujuan kegiatan ini adalah:", ...tujuan
      ].join("\n"),
      ruanglingkup: [
        "Ruang lingkup kegiatan ini meliputi:",
        `1. Lokasi: wilayah kerja ${wilayahNama}, Balai Taman Nasional Tambora${I.gridText ? `, khususnya pada ${I.gridText}` : ""};`,
        `2. Waktu: tanggal ${tgl} sesuai Surat Tugas;`,
        "3. Objek kegiatan:", ...ruang.map((x, i) => `${String.fromCharCode(97 + i)}. ${x}`),
        "4. Batasan: data yang dikumpulkan terbatas pada temuan yang direkam tim menggunakan aplikasi SMART Mobile di sepanjang jalur patroli selama periode kegiatan."
      ].join("\n"),
      lokasi: [
        W && Wl ? Wl.keadaan(W, I.share, true) : `Lokasi kegiatan berada di wilayah kerja ${I.lokasi}.`,
        I.gridFeatures.length ? `Patroli direncanakan pada ${I.gridText}${zonaTxt ? ` yang berada pada ${zonaTxt}` : ""}, dengan luas cakupan rencana ±${R.num(I.gridFeatures.length * 100, 0)} ha (grid patroli 1 km × 1 km). Target minimal kegiatan adalah patroli rimba pada sedikitnya tiga grid, dengan capaian output dihitung dari jumlah grid patroli dalam satuan hektare. Rincian grid rencana disajikan pada tabel berikut.` : ""
      ].filter(Boolean).join("\n"),
      waktu: [
        `Kegiatan ${J} akan dilaksanakan selama ${I.hari ? nTxt(I.hari) : "…"} hari, terhitung mulai tanggal ${tgl} sesuai Surat Tugas, termasuk perjalanan menuju lokasi, pelaksanaan patroli, dan kembali ke kantor.${tahap.length ? " Tahapan kegiatan adalah sebagai berikut:" : ""}`,
        ...tahap.map((x, i) => `${i + 1}. ${cap1(x)}${i === tahap.length - 1 ? "." : ";"}`)
      ].join("\n"),
      metode: [
        `Data yang akan dikumpulkan terdiri atas data primer dan data sekunder. Data primer diperoleh melalui pengamatan langsung di lapangan serta perekaman jalur dan temuan menggunakan aplikasi SMART Mobile, sedangkan data sekunder berupa peta kerja Balai, batas wilayah kerja resor${kajian ? `, dan ${kajian}` : ""}. Lokasi pengamatan ditentukan secara sengaja (purposive sampling) berdasarkan ${K && K.id === "kamera" ? "jalur satwa, sumber air, dan lokasi rawan kebakaran" : "grid sasaran, kerawanan gangguan, dan potensi kawasan"}.`,
        "Kegiatan akan dilaksanakan berdasarkan Keputusan Direktur Jenderal Konservasi Sumber Daya Alam dan Ekosistem Nomor 74 Tahun 2025 tentang Panduan Patroli Berbasis Spatial Monitoring and Reporting Tool (SMART), dengan tahapan sebagai berikut:",
        ...R.metodeLines(I.metodeText, K).map((x, i) => `${i + 1}. ${x}`)
      ].join("\n"),
      analisis: [
        "Data hasil patroli akan diunduh dari SMART Mobile ke SMART Desktop, kemudian diverifikasi meliputi kesesuaian kategori temuan, koordinat, tanggal, foto, dan kemungkinan pencatatan ganda.",
        "Data yang telah diverifikasi akan dianalisis secara deskriptif kuantitatif: jumlah catatan per kategori, jumlah titik koordinat unik, jumlah jenis yang teridentifikasi, serta sebaran temuan per grid patroli, zona, dan resor melalui tumpang susun (overlay) dengan peta kerja Balai. Panjang lintasan akan dihitung dari track GPS per hari dan dipisahkan menurut moda. Hasil analisis akan disajikan dalam laporan kegiatan beserta matriks data hasil kegiatan dan matriks analisis data, paling lambat tujuh hari setelah pelaksanaan kegiatan.",
        ...(K && K.analisis ? [kt(K.analisis)] : [])
      ].join("\n"),
      penutup: [
        "Demikian Rencana Pelaksanaan Kegiatan (RPK) ini disusun sebagai acuan penyelenggaraan kegiatan sesuai dengan aturan, petunjuk pelaksanaan, dan petunjuk teknis yang telah ditetapkan untuk mencapai tujuan yang diharapkan.",
        "Masukan dan saran dari semua pihak sangat kami harapkan untuk penyempurnaan Rencana Pelaksanaan Kegiatan (RPK) ini."
      ].join("\n")
    };
  }

  /* ---------- Kesiapan ---------- */
  function readiness(I, info, profile, scans, notes) {
    const alatKosong = I.alat.filter((x) => (x.nama || "").trim() && !String(x.jumlah || "").trim());
    const d = I.auto;
    return [
      { label: "Judul kegiatan", ok: !!(info.judul || "").trim(), note: !(info.judul || "").trim() ? "" : I.keg ? (I.keg.judul === I.judul ? "" : `narasi mengikuti judul baku "${I.keg.judul}"`) : "tidak cocok dengan judul baku, narasi umum dipakai" },
      { label: "Wilayah kerja (SPTN/resor)", ok: !!I.W, note: I.W ? `${I.W.nama}${I.wilayahAuto ? ` (otomatis${d ? `, ${Math.round(d.counts[0].share * 100)}% grid di Resor ${d.counts[0].resor.nama}` : ""}; ubah di Data rencana bila perlu)` : ""}` : "pilih wilayah kerja atau isi nomor grid rencana" },
      { label: "Nomor dan tanggal Surat Tugas", ok: !!(I.nomorST && I.tanggalST) },
      { label: "Tanggal pelaksanaan", ok: !!(info.tglMulai && info.tglSelesai), note: I.mulai ? periodeSd(I.mulai, I.selesai) : "" },
      { label: `DIPA TA.${I.year}`, ok: !!I.nomorDipa, note: I.nomorDipa || "belum ada di data/dipa.json" },
      { label: "Rincian anggaran", ok: I.total > 0, note: I.anggaran },
      { label: "Alat dan bahan (jenis dan jumlah)", ok: !alatKosong.length, note: alatKosong.length ? `${alatKosong.length} baris belum diisi jumlahnya` : "" },
      R.kegTeamCheck(I.keg, I.members),
      { label: "Tim pelaksana dan koordinator", ok: I.members.length > 0 && !!I.koordinator, note: `${I.members.length} orang${I.koordinator ? "" : ", koordinator belum dipilih"}` },
      { label: "Pejabat Pembuat Komitmen", ok: !!I.ppk, note: I.ppk ? I.ppk.nama : "" },
      { label: "Kepala Balai (nama, NIP)", ok: !!(profile.kepalaBalaiNama && profile.kepalaBalaiNip) },
      { label: "Grid rencana", ok: I.gridFeatures.length > 0 && !I.notFound.length, note: I.notFound.length ? `tidak ditemukan: ${I.notFound.join(", ")}` : I.grids.join(", ") },
      { label: "Tempat dan tanggal penyusunan", ok: !!info.tanggalTtd, note: `${I.kota || "…"}, ${tglPanjang(I.tanggalTtd)}${info.tanggalTtd ? "" : " (sementara)"}` },
      { label: "Scan Surat Tugas", ok: scans.length > 0, note: scans.length ? `${scans.length} halaman` : "" },
      R.hasPH(notes) ? { label: "Isian bertanda [ … ] di narasi", ok: false, note: "narasi lama yang tersimpan masih memuat isian; klik Atur ulang narasi atau lengkapi teks berlatar kuning" } : null,
      { label: "Narasi sudah diperiksa", ok: !!info.narasiOk, note: "centang setelah teks diperiksa" }
    ].filter(Boolean);
  }

  /* ---------- HTML ---------- */
  function render(I, profile, notes, map) {
    const balai = profile.balai || "Balai Taman Nasional Tambora";
    const periodeTxt = I.mulai ? periodeSd(I.mulai, I.selesai) : "……………";
    const J = I.judulLengkap, N = numbering(), ttd = tglPanjang(I.tanggalTtd), koor = I.koordinator || {};

    const body = [R.kopHtml(profile), R.titleHtml("RENCANA PELAKSANAAN KEGIATAN", J)];
    /* 1. Pendahuluan */
    body.push(N.h1("1. Pendahuluan"), N.h2("a. Umum"), noteBlock(notes, "latar"), N.h2("b. Maksud dan Tujuan"), noteBlock(notes, "maksud"), N.h2("c. Ruang Lingkup"), noteBlock(notes, "ruanglingkup"),
      N.h2("d. Dasar"), para(`Dasar pelaksanaan kegiatan ${esc(J)} adalah sebagai berikut:`), olList(R.dasarList(profile, I, I.members)));

    /* 2. Kegiatan yang akan dilaksanakan */
    const gridTable = I.gridInfo.length ? [N.cap("Grid Rencana Patroli"), `<table class="data"><thead><tr><th>No</th><th>Grid</th><th>Zona</th><th>Resor</th>${I.gridInfo.some((g) => g.sptn) ? "<th>SPTN</th>" : ""}</tr></thead><tbody>${I.gridInfo.map((g, i) => `<tr><td class="c">${i + 1}</td><td class="c">${esc(g.grid)}</td><td>${esc(g.zona || "-")}</td><td>${esc(g.resort || "-")}</td>${I.gridInfo.some((x) => x.sptn) ? `<td>${esc(g.sptn || "-")}</td>` : ""}</tr>`).join("")}</tbody></table>`] : [];
    const sched = I.mulai ? [[`Persiapan dan penyusunan Rencana Pelaksanaan Kegiatan ${I.judul}`, I.tanggalTtd < I.mulai ? I.tanggalTtd : addDays(I.mulai, -1), addDays(I.mulai, -1)],
      [`Pelaksanaan Kegiatan ${I.judul}`, I.mulai, I.selesai], [`Pengolahan Data dan Penyusunan Laporan Kegiatan ${I.judul}`, addDays(I.selesai, 1), addDays(I.selesai, 7)]].filter((r) => r[1] <= r[2]) : [];
    body.push(N.h1("2. Kegiatan yang akan dilaksanakan"),
      N.h2("a. Keadaan Umum Lokasi Kegiatan"), noteBlock(notes, "lokasi"), ...gridTable,
      N.h2("b. Waktu Pelaksanaan"), noteBlock(notes, "waktu"),
      N.h2("c. Alat dan Bahan"), para("Alat dan bahan yang akan digunakan dalam kegiatan ini adalah sebagai berikut:"), N.cap("Alat dan Bahan"), R.alatTable(I.alat),
      N.h2("d. Metode Pelaksanaan/Metode Pengumpulan Data"), noteBlock(notes, "metode"),
      N.h2("e. Metode Analisis Data"), noteBlock(notes, "analisis"),
      N.h2("f. Tim Pelaksana"), para(`${esc(R.teamSentence(I.members))} Susunan tim dan peran masing-masing anggota disajikan pada tabel berikut:`),
      N.cap("Susunan dan Peran Tim Pelaksana"), R.teamTable(I.members, I.peranOf),
      ...(I.members.length ? [para("Uraian tugas setiap peran dalam tim adalah sebagai berikut:"), olList(R.peranLines(I.members, I.peranOf))] : []),
      N.h2("g. Rincian Anggaran dan Biaya"), para(`Kegiatan ini akan dibiayai dari ${esc(I.sumberAnggaran)}${I.nomorDipa ? ` (DIPA Nomor ${esc(I.nomorDipa)}${I.tanggalDipa ? ` tanggal ${esc(tglPanjang(I.tanggalDipa))}` : ""})` : ""} dengan jumlah ${esc(I.anggaran || "Rp……………")}, dengan rincian sebagai berikut:`),
      N.cap("Rincian Anggaran dan Biaya"), R.rabTable(I.rab, I.total),
      N.h2("h. Tata Waktu/Jadwal Pelaksanaan"),
      ...(sched.length ? [para("Tahapan dan jadwal pelaksanaan kegiatan direncanakan sebagai berikut:"), N.cap("Rencana Tata Waktu Pelaksanaan Kegiatan"), R.ganttTable(sched)] : [para("Jadwal tersusun otomatis setelah tanggal pelaksanaan diisi.")]));

    /* 3. Penutup */
    body.push(N.h1("3. Penutup"), noteBlock(notes, "penutup", 1));
    body.push(R.closingHtml(I.kota, ttd, "Koordinator Kegiatan,", koor.nama, koor.nip));
    body.push(R.lampiranIndex(["Surat Tugas", "Peta Kerja (Peta Rencana Pelaksanaan Kegiatan)"]));

    /* Lampiran */
    body.push(N.h1("LAMPIRAN", "front", true), N.h2("1. Surat Tugas", "lamp"));
    if ((I.scans || []).length) body.push(I.scans.map((u) => `<figure class="scan"><img src="${u}" alt="Surat Tugas"></figure>`).join(""));
    else body.push(`<p class="para placeholder noprint">Unggah scan Surat Tugas (JPG, PNG, atau PDF) di langkah 4.</p>`);
    body.push(N.h2("2. Peta Kerja", "lamp", true));
    if (map) body.push(`<figure class="map" data-block="peta"><img src="${map.dataUrl}" alt="Peta Rencana Pelaksanaan Kegiatan"></figure>`);
    else body.push(`<p class="para placeholder noprint">Isi nomor grid rencana untuk membuat peta kerja.</p>`);

    /* Sampul, lembar pengesahan, daftar isi, daftar tabel */
    const cover = R.coverHtml({ jenis: "RENCANA PELAKSANAAN KEGIATAN", judul: J, balai, logo: profile.logo, nomorST: I.nomorST, periode: periodeTxt, kota: I.kota, bulanTahun: R.bulanTahun(I.tanggalTtd) });
    const kv = [["Judul Kegiatan", J], ["Waktu Kegiatan", periodeTxt], ["Lokasi Kegiatan", `${I.lokasi}${I.gridText ? `, ${I.gridText}` : ""}`],
      ["Pelaksana", `Tim ${R.teamShort(I.members)}`], ["Jumlah Anggaran", I.anggaran || "Rp……………"], ["Sumber Anggaran", I.sumberAnggaran],
      ["Disusun di", I.kota || "……………"], ["Pada Tanggal", ttd], ["Oleh", "Tim Pelaksana Kegiatan"]];
    const peng = R.pengesahanHtml(profile, kv, {
      left: { head: "Diperiksa dan Disetujui,", jab: "Pejabat Pembuat Komitmen,", nama: I.ppk && I.ppk.nama, nip: I.ppk && I.ppk.nip },
      right: { head: "", jab: "Koordinator Kegiatan,", nama: koor.nama, nip: koor.nip },
      bottom: { head: "Mengesahkan,", jab: profile.kepalaBalaiJabatan || "Kepala Balai,", nama: profile.kepalaBalaiNama, nip: profile.kepalaBalaiNip }
    });
    const toc = [{ lv: 1, text: "LEMBAR PENGESAHAN" }, { lv: 1, text: "DAFTAR ISI" }, { lv: 1, text: "DAFTAR TABEL" }, ...N.toc];
    return `<section class="sec-cover">${cover}</section>\n<section class="sec-front">${peng}${R.tocHtml(toc, N.tables)}</section>\n<section class="sec-body">${body.join("\n")}</section>`;
  }

  window.SRGRpk = { build, autoNotes, readiness, render, splitGrids, DEFAULT_RAB: R.DEFAULT_RAB, DEFAULT_AKUN: R.DEFAULT_AKUN };
})();
