/*
 * Rencana Pelaksanaan Kegiatan (RPK). Susunan diseragamkan dengan LPK:
 * kop, RENCANA PELAKSANAAN KEGIATAN / TENTANG / judul dan pengesahan, lalu
 * A. Pendahuluan, B. Rencana Pelaksanaan, C. Penutup, dan lampiran peta grid serta Surat Tugas.
 * Semua isian dari form; tidak memakai file patroli SMART.
 */
(function () {
  "use strict";
  const R = window.SRGReport;
  const { esc, tglPanjang, periodeSd, parseISO, sign, noteBlock, nTxt, listText, PH, addDays } = R;

  const splitGrids = (t) => [...new Set(String(t || "").split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean))];

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
  // info: isian form; team: [{nama, nip, pangkat, jabatan, unsur, rank, koordinator}]; rab, alat: baris tabel
  function build(info, profile, team, rab, layers, ppk, alat) {
    const today = new Date().toISOString().substr(0, 10);
    const mulai = info.tglMulai || "", selesai = info.tglSelesai && info.tglSelesai >= mulai ? info.tglSelesai : mulai;
    const year = (mulai || info.tanggalST || today).substr(0, 4);
    const dipa = (window.SRG_DIPA || {})[year] || {};
    const akun = (info.akun || R.DEFAULT_AKUN).trim();
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
    const members = team.map((m) => ({ ...m, name: m.nama, unsur: m.unsur || "masyarakat" })).sort((a, b) => R.unsurGroup(a.unsur) - R.unsurGroup(b.unsur) || a.rank - b.rank);
    const rows = R.rabRows(rab), total = rows.reduce((s, r) => s + r.total, 0);
    return {
      judul: judul || "……………", lokasi: lokasi || "……………", nomorST: (info.nomorST || "").trim(), tanggalST: info.tanggalST || "", mulai, selesai,
      hari: mulai ? Math.round((parseISO(selesai) - parseISO(mulai)) / 864e5) + 1 : 0, year, akun,
      nomorDipa: dipa.nomor || "", tanggalDipa: dipa.tanggal || "", sumberAnggaran: R.sumberAnggaran(year, akun),
      rab: rows, total, anggaran: R.rupiah(total), alat: alat || R.alatFor(R.kegiatanOf(judul)),
      kota: info.tempatTtd || profile.kota || "", tanggalTtd: info.tanggalTtd || today,
      grids, gridFeatures, gridInfo, notFound, zonas: uniq(gridInfo.map((g) => g.zona)), resorts: uniq(gridInfo.map((g) => g.resort)),
      gridText: grids.length ? `Grid ${listText(grids)}` : "", members, koordinator: members.find((m) => m.koordinator) || null, ppk: ppk || null,
      keg: R.kegiatanOf(judul), fire: /kebakaran|karhut|\bapi\b/i.test(judul) || !!(R.kegiatanOf(judul) || {}).fire, metodeText: profile.metode,
      J: /\bdi\s+Kawasan\b/i.test(judul) ? judul : `${judul || "……………"} di Kawasan Taman Nasional Tambora`
    };
  }

  /* ---------- Narasi (bisa diedit di halaman) ---------- */
  function autoNotes(I) {
    const J = I.J;
    const tgl = I.mulai ? periodeSd(I.mulai, I.selesai) : "……………";
    const zona = I.zonas.length ? ` (${listText(I.zonas)}${I.resorts.length ? `, Resor ${listText(I.resorts)}` : ""})` : "";
    const K = I.keg, kt = (x) => R.kegText(x, true, I.members), num1 = (a) => a.map((x, i) => `${i + 1}. ${kt(x)}`);
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
    return {
      latar: [
        "Kawasan Taman Nasional Tambora merupakan kawasan pelestarian alam dengan sistem zonasi untuk tujuan penelitian, pendidikan, ilmu pengetahuan, budi daya, pariwisata, dan rekreasi. Berdasarkan Keputusan Menteri Lingkungan Hidup dan Kehutanan Nomor SK.111/Menlhk-II/2015 tanggal 27 April 2015, kawasan ini ditetapkan sebagai taman nasional dengan luas 71.645,64 hektare.",
        "Secara administratif kawasan Taman Nasional Tambora berada di Kabupaten Bima dan Kabupaten Dompu, Provinsi Nusa Tenggara Barat. Upaya menjaga kelestarian kawasan masih menghadapi berbagai tantangan, antara lain ketergantungan masyarakat terhadap kawasan hutan, perambahan, penebangan liar, perburuan satwa, penguasaan lahan untuk perkebunan, serta kebakaran hutan dan lahan.",
        ...(K && K.konteks ? [K.konteks] : []),
        "Polisi Kehutanan merupakan pejabat fungsional yang bertugas menyiapkan, melaksanakan, mengembangkan, memantau, mengevaluasi, dan melaporkan kegiatan perlindungan dan pengamanan hutan. Patroli merupakan salah satu kewenangan Polisi Kehutanan untuk mencegah dan menanggulangi gangguan terhadap kawasan hutan.",
        `Oleh karena itu, akan dilaksanakan kegiatan ${J} pada tanggal ${tgl}${I.gridText ? ` yang difokuskan pada ${I.gridText}` : ""}, dengan pengambilan data menggunakan metode Spatial Monitoring and Reporting Tool (SMART).`
      ].join("\n"),
      maksud: [
        K && K.maksud ? `Kegiatan ${J} dimaksudkan sebagai upaya ${K.maksud}${I.gridText ? `, khususnya pada ${I.gridText}` : ""}.` : `Kegiatan ${J} dimaksudkan sebagai langkah preventif ${I.fire ? "pencegahan kebakaran hutan dan lahan serta " : ""}pengamanan dan perlindungan kawasan Taman Nasional Tambora terhadap gangguan seperti perambahan, pembalakan liar, perburuan satwa, serta kebakaran hutan dan lahan.`,
        "Adapun tujuan kegiatan ini adalah:", ...tujuan
      ].join("\n"),
      ruanglingkup: K && K.ruang ? [`Ruang lingkup kegiatan secara kewilayahan mencakup Wilayah Kerja ${I.lokasi}${I.gridText ? `, khususnya pada ${I.gridText}${zona}` : ""}. Ruang lingkup materi kegiatan meliputi:`, ...num1(K.ruang)].join("\n") : `Ruang lingkup kegiatan ${J} adalah perlindungan dan pengamanan kawasan dari gangguan dengan menerapkan prinsip pre-emtif dan preventif. Kegiatan akan dilaksanakan dengan penyisiran dan pengecekan kondisi kawasan${I.gridText ? ` pada ${I.gridText}${zona}` : ""}, disertai pengambilan data SMART Patrol berupa data gangguan dan potensi kawasan.`,
      lokasi: [
        `Lokasi kegiatan berada di Wilayah Kerja ${I.lokasi}${I.gridText ? `, meliputi ${I.gridText}${zona}` : ""} dengan luas rencana cakupan ±${I.gridFeatures.length * 100} hektare (grid patroli 1 km × 1 km). Target minimal kegiatan adalah patroli rimba sepanjang minimal 3 grid per kegiatan, dengan penghitungan capaian output menggunakan grid patroli yang dikalkulasi dalam hektare.`,
        PH("Uraikan kondisi lokasi rencana: topografi, tutupan vegetasi, aksesibilitas, jalur patroli yang akan dilalui, sumber air, dan kerawanan")
      ].join("\n"),
      waktu: `Kegiatan ${J} akan dilaksanakan selama ${I.hari ? nTxt(I.hari) : "…"} hari, terhitung mulai tanggal ${tgl} sesuai Surat Tugas. Waktu tersebut merupakan keseluruhan waktu kerja tim, termasuk persiapan, perjalanan menuju lokasi, pelaksanaan patroli, dan kembali ke kantor; perekaman data SMART akan dilakukan selama patroli di lapangan.`,
      metode: R.metodeLines(I.metodeText, K).map((x, i) => `${i + 1}. ${x}`).join("\n"),
      analisis: "Data hasil patroli akan diunduh dari SMART Mobile ke SMART Desktop, kemudian diverifikasi meliputi kesesuaian kategori temuan, koordinat, tanggal, foto, dan kemungkinan pencatatan ganda. Data yang telah diverifikasi akan dianalisis secara deskriptif kuantitatif: jumlah catatan per kategori, jumlah titik koordinat unik, jumlah jenis yang teridentifikasi, serta sebaran temuan per grid patroli, zona, dan resor melalui tumpang susun (overlay) dengan peta kerja Balai. Panjang lintasan akan dihitung dari track GPS per hari dan dipisahkan menurut moda. Pelaporan akan dibuat paling lambat 7 hari setelah pelaksanaan kegiatan." + (K && K.analisis ? "\n" + kt(K.analisis) : ""),
      penutup: [
        "Demikian Rencana Pelaksanaan Kegiatan (RPK) ini disusun sebagai acuan penyelenggaraan kegiatan sesuai dengan aturan, petunjuk pelaksanaan, dan petunjuk teknis yang telah ditetapkan untuk mencapai tujuan yang diharapkan.",
        "Masukan dan saran dari semua pihak sangat kami harapkan untuk penyempurnaan Rencana Pelaksanaan Kegiatan (RPK) ini."
      ].join("\n")
    };
  }

  /* ---------- Kesiapan ---------- */
  function readiness(I, info, profile, scans, notes) {
    const alatKosong = I.alat.filter((x) => (x.nama || "").trim() && !String(x.jumlah || "").trim());
    return [
      { label: "Judul kegiatan", ok: !!(info.judul || "").trim(), note: !(info.judul || "").trim() ? "" : I.keg ? (I.keg.judul === I.judul ? "" : `narasi mengikuti judul baku "${I.keg.judul}"`) : "tidak cocok dengan judul baku, narasi umum dipakai" },
      { label: "Lokasi (wilayah kerja)", ok: !!(info.lokasi || "").trim() },
      { label: "Nomor dan tanggal Surat Tugas", ok: !!(I.nomorST && I.tanggalST) },
      { label: "Tanggal pelaksanaan", ok: !!(info.tglMulai && info.tglSelesai), note: I.mulai ? periodeSd(I.mulai, I.selesai) : "" },
      { label: `DIPA TA.${I.year}`, ok: !!I.nomorDipa, note: I.nomorDipa || "belum ada di data/dipa.json" },
      { label: "Rincian anggaran", ok: I.total > 0, note: I.anggaran },
      { label: "Alat dan bahan (jenis dan jumlah)", ok: !alatKosong.length, note: alatKosong.length ? `${alatKosong.length} baris belum diisi jumlahnya` : "" },
      R.kegTeamCheck(I.keg, I.members),
      { label: "Tim pelaksana dan koordinator", ok: I.members.length > 0 && !!I.koordinator, note: `${I.members.length} orang${I.koordinator ? "" : ", koordinator belum dipilih"}` },
      { label: "Pejabat Pembuat Komitmen", ok: !!I.ppk, note: I.ppk ? I.ppk.nama : "" },
      { label: "Kepala Balai", ok: !!profile.kepalaBalaiNama },
      { label: "Grid rencana", ok: I.gridFeatures.length > 0 && !I.notFound.length, note: I.notFound.length ? `tidak ditemukan: ${I.notFound.join(", ")}` : I.grids.join(", ") },
      { label: "Tempat dan tanggal penyusunan", ok: !!info.tanggalTtd, note: `${I.kota || "…"}, ${tglPanjang(I.tanggalTtd)}${info.tanggalTtd ? "" : " (sementara)"}` },
      { label: "Scan Surat Tugas", ok: scans.length > 0, note: scans.length ? `${scans.length} halaman` : "" },
      { label: "Isian bertanda [ … ] di narasi sudah dilengkapi", ok: !R.hasPH(notes), note: R.hasPH(notes) ? "cari teks berlatar kuning bertanda kurung siku" : "" },
      { label: "Narasi sudah diperiksa", ok: !!info.narasiOk, note: "centang setelah teks diperiksa" }
    ].filter(Boolean);
  }

  /* ---------- HTML ---------- */
  function render(I, profile, notes, map) {
    const balai = profile.balai || "Balai Taman Nasional Tambora";
    const periodeTxt = I.mulai ? periodeSd(I.mulai, I.selesai) : "……………";
    const J = I.J;
    const h2 = (txt) => `<h2 class="sec">${esc(txt)}</h2>`, h3 = (txt) => `<h3>${esc(txt)}</h3>`;

    const kv = [
      ["Judul Kegiatan", R.judulLengkap(I.judul, I.lokasi)], ["Nomor Surat Tugas", `${I.nomorST || "……………"}${I.tanggalST ? ` tanggal ${tglPanjang(I.tanggalST)}` : ""}`],
      ["Waktu Kegiatan", periodeTxt], ["Lokasi Kegiatan", `Wilayah Kerja ${I.lokasi}${I.gridText ? `, ${I.gridText}` : ""}`],
      ["Pelaksana", `Tim ${R.teamShort(I.members)}`],
      ["Jumlah Anggaran", I.anggaran || "Rp……………"], ["Sumber Anggaran", I.sumberAnggaran], ["Disusun di", I.kota || "……………"], ["Pada Tanggal", tglPanjang(I.tanggalTtd)]
    ];
    const front = [R.kopHtml(balai), R.titleHtml("RENCANA PELAKSANAAN KEGIATAN", ((t) => (/tambora/i.test(t) ? t : `${t} ${balai.replace(/^Balai\s+/i, "")}`))(R.judulLengkap(I.judul, I.lokasi))),
      `<table class="kv-plain">${kv.map(([k, v]) => `<tr><td>${esc(k)}</td><td>:</td><td>${esc(v)}</td></tr>`).join("")}</table>
      <table class="sign"><tr><td>${sign(["Diperiksa dan Disetujui,", "Pejabat Pembuat Komitmen,"], I.ppk && I.ppk.nama, I.ppk && I.ppk.nip)}</td>
      <td>${sign(["", "Koordinator Kegiatan,"], I.koordinator && I.koordinator.nama, I.koordinator && I.koordinator.nip)}</td></tr>
      <tr><td colspan="2">${sign(["Mengesahkan,", `Kepala ${balai},`], profile.kepalaBalaiNama, profile.kepalaBalaiNip)}</td></tr></table>`];

    const body = [];
    body.push(h2("A. PENDAHULUAN"), h3("1. Latar Belakang"), noteBlock(notes, "latar"), h3("2. Maksud dan Tujuan"), noteBlock(notes, "maksud"), h3("3. Ruang Lingkup"), noteBlock(notes, "ruanglingkup"),
      h3("4. Dasar"), `<p class="para">Dasar pelaksanaan Kegiatan ${esc(J)} adalah sebagai berikut:</p>`,
      `<ol class="list">${R.dasarList(profile, I, I.members).map((d) => `<li>${esc(d.replace(/^\d+[.)]\s*/, ""))}</li>`).join("")}</ol>`);

    const sched = I.mulai ? [[`Persiapan dan penyusunan Rencana Pelaksanaan Kegiatan ${I.judul}`, I.tanggalTtd < I.mulai ? I.tanggalTtd : addDays(I.mulai, -1), addDays(I.mulai, -1)],
      [`Pelaksanaan Kegiatan ${I.judul}`, I.mulai, I.selesai], [`Penyusunan Laporan Kegiatan ${I.judul}`, addDays(I.selesai, 1), addDays(I.selesai, 7)]].filter((r) => r[1] <= r[2]) : [];
    body.push(h2("B. RENCANA PELAKSANAAN"), h3("1. Keadaan Lokasi"), noteBlock(notes, "lokasi"),
      ...(I.gridInfo.length ? [`<p class="cap">Tabel 1 Grid Rencana Patroli</p>`, `<table class="data"><thead><tr><th>No</th><th>Grid</th><th>Zona</th><th>Resor</th></tr></thead><tbody>${I.gridInfo.map((g, i) => `<tr><td class="c">${i + 1}</td><td class="c">${esc(g.grid)}</td><td>${esc(g.zona || "-")}</td><td>${esc(g.resort || "-")}</td></tr>`).join("")}</tbody></table>`] : []),
      h3("2. Waktu Pelaksanaan"), noteBlock(notes, "waktu"),
      h3("3. Alat dan Bahan"), `<p class="para">Alat dan bahan yang akan digunakan dalam kegiatan ini adalah sebagai berikut:</p>`, `<p class="cap">Tabel 2 Alat dan Bahan</p>`, R.alatTable(I.alat),
      h3("4. Metode"), `<p class="sub">a. Metode Pelaksanaan</p>`,
      `<p class="para">Kegiatan akan dilaksanakan berdasarkan Keputusan Direktur Jenderal Konservasi Sumber Daya Alam dan Ekosistem Nomor 74 Tahun 2025 tentang Panduan Patroli Berbasis Spatial Monitoring and Reporting Tool (SMART), dengan tahapan sebagai berikut:</p>`, noteBlock(notes, "metode"),
      `<p class="sub">b. Metode Analisis Data</p>`, noteBlock(notes, "analisis"),
      h3("5. Tim Pelaksana"), `<p class="para">${esc(R.teamSentence(I.members))} Susunan tim disajikan pada tabel berikut:</p>`,
      `<p class="cap">Tabel 3 Tim Pelaksana Kegiatan</p>`, R.teamTable(I.members, (m) => (m.koordinator ? "Koordinator" : "")),
      h3("6. Anggaran dan Tata Waktu"),
      `<p class="para">Kegiatan ini akan dibiayai dari ${esc(I.sumberAnggaran)}${I.nomorDipa ? ` (DIPA Nomor ${esc(I.nomorDipa)} tanggal ${esc(tglPanjang(I.tanggalDipa))})` : ""} dengan jumlah ${esc(I.anggaran || "Rp……………")}, dengan rincian sebagai berikut:</p>`,
      `<p class="cap">Tabel 4 Rincian Anggaran Biaya</p>`, R.rabTable(I.rab, I.total),
      ...(sched.length ? [`<p class="para">Tata waktu pelaksanaan kegiatan direncanakan sebagai berikut:</p>`, `<p class="cap">Tabel 5 Rencana Tata Waktu</p>`, R.ganttTable(sched)] : []));

    body.push(h2("C. PENUTUP"), noteBlock(notes, "penutup"));
    body.push(`<table class="sign right"><tr><td></td><td>${sign([`${I.kota || "………"}, ${tglPanjang(I.tanggalTtd)}`, "Koordinator Kegiatan,"], I.koordinator && I.koordinator.nama, I.koordinator && I.koordinator.nip)}</td></tr></table>`);

    body.push(`<h1 class="pb" id="lampiran">LAMPIRAN</h1><h2 class="lamp">A. Peta Rencana Pelaksanaan Kegiatan</h2>`);
    if (map) body.push(`<figure class="map" data-block="peta"><img src="${map.dataUrl}" alt=""></figure>`, `<p class="cap">Gambar 1 Peta Rencana Smart Patrol Berbasis Grid</p>`);
    else body.push(`<p class="para placeholder">Isi nomor grid rencana untuk membuat peta.</p>`);
    body.push(`<h2 class="lamp pb">B. Surat Tugas</h2>`);
    if ((I.scans || []).length) body.push(I.scans.map((u) => `<figure class="scan"><img src="${u}" alt="Surat Tugas"></figure>`).join(""));
    else body.push(`<p class="para placeholder">Unggah scan Surat Tugas (JPG, PNG, atau PDF).</p>`);

    return `<section class="sec-front">${front.join("\n")}</section>\n<section class="sec-body">${body.join("\n")}</section>`;
  }

  window.SRGRpk = { build, autoNotes, readiness, render, splitGrids, DEFAULT_RAB: R.DEFAULT_RAB, DEFAULT_AKUN: R.DEFAULT_AKUN };
})();
