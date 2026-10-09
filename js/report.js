/*
 * Model laporan dan HTML laporan mengikuti format Laporan Pelaksanaan Kegiatan (LPK)
 * Balai Taman Nasional Tambora: sampul, lembar pengesahan, daftar isi, Bab I–IV, lampiran.
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
  // "20 April s.d 24 April 2026" seperti di lembar pengesahan
  function periodeSd(a, b) {
    const A = parseISO(a), B = parseISO(b || a);
    const left = `${A.getUTCDate()} ${BULAN[A.getUTCMonth()]}` + (A.getUTCFullYear() !== B.getUTCFullYear() ? " " + A.getUTCFullYear() : "");
    return a === b ? tglPanjang(a) : `${left} s.d ${tglPanjang(b)}`;
  }
  const terbilang = (n) => (n < 12 ? SATUAN[n] : n < 20 ? SATUAN[n - 10] + " belas" : n < 100 ? SATUAN[Math.floor(n / 10)] + " puluh" + (n % 10 ? " " + SATUAN[n % 10] : "") : String(n));
  const num = (v, d = 0) => Number(v).toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtNum = (v) => (Number.isInteger(v) ? num(v) : num(v, 2).replace(/,?0+$/, ""));
  const rupiah = (v) => { const n = Number(String(v || "").replace(/[^\d]/g, "")); return n ? "Rp. " + n.toLocaleString("id-ID") : ""; };
  // NIP 18 digit -> "19980426 202506 2 013"
  const fmtNip = (nip) => { const d = String(nip || "").replace(/\D/g, ""); return d.length === 18 ? `${d.substr(0, 8)} ${d.substr(8, 6)} ${d.substr(14, 1)} ${d.substr(15)}` : String(nip || ""); };
  const toMin = (t) => { const [h, m, s] = (t || "0:0:0").split(":").map(Number); return h * 60 + m + (s || 0) / 60; };
  const hhmm = (min) => `${Math.floor(min / 60)} jam ${String(Math.round(min % 60)).padStart(2, "0")} menit`;
  // Waktu track SMART disimpan sebagai jam lokal perangkat, jadi dibaca apa adanya.
  const clock = (ms) => new Date(ms).toISOString().substr(11, 5);
  const lines = (t) => String(t || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Urutan dan warna kategori utama sesuai urutan bab hasil di LPK.
  const TOP_ORDER = ["aktivitasmanusia", "satwaliar", "tumbuhan", "spesiesinvasif", "groundcheck", "fitur"];
  const TOP_COLORS = { satwaliar: "#e8590c", tumbuhan: "#2f9e44", spesiesinvasif: "#9c36b5", aktivitasmanusia: "#e03131", fitur: "#1971c2", groundcheck: "#a0702a" };
  const SPARE = ["#0c8599", "#f08c00", "#5c940d", "#c2255c", "#495057", "#3b5bdb"];
  const DAY_COLORS = ["#1c7ed6", "#f76707", "#2b8a3e", "#ae3ec9", "#e64980", "#0b7285", "#5f3dc4", "#d9480f"];
  const BIODIV = ["satwaliar", "tumbuhan", "spesiesinvasif"];

  /* ---------- Label ---------- */
  function makeLabeler(dicts) {
    const unknown = new Map();
    const pretty = (key) => { const segs = key.split(".").filter(Boolean); const s = segs[segs.length - 1] || key; return s.charAt(0).toUpperCase() + s.slice(1); };
    const variants = (k) => [k, k.endsWith(".") ? k.slice(0, -1) : k + "."];
    const find = (key) => {
      for (const d of dicts) for (const k of ["items", "categories", "attributes"]) for (const v of variants(key)) if (d[k] && d[k][v]) return d[k][v];
      return null;
    };
    const look = (kind, key, attrKey) => {
      if (!key) return "";
      for (const d of dicts) {
        if (attrKey && d.items) for (const v of variants(key)) if (d.items[attrKey + "|" + v]) return d.items[attrKey + "|" + v];
        for (const v of variants(key)) if (d[kind] && d[kind][v]) return d[kind][v];
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
      members.push({
        ...m, smartName, name: (dir && dir.nama) || man.nama || smartName, nip: (dir && dir.nip) || man.nip || m.employeeId,
        jabatan: (dir && dir.jabatan) || man.jabatan || "", pangkat: (dir && dir.pangkat) || man.pangkat || "",
        inDirectory: !!dir, manualOk: !!(man.nama && man.jabatan), rank: dir ? dir.rank : 1e6 + members.length
      });
    }));
    members.sort((a, b) => a.rank - b.rank);
    const leader = members.find((m) => m.isLeader);

    const gridLayer = layers.find((l) => l.role === "grid"), zonaLayer = layers.find((l) => l.role === "zonasi"), resortLayer = layers.find((l) => l.role === "resort");
    const days = [], observations = [], waypoints = [], dayLines = [], photos = [];
    patrol.legs.forEach((lg) => lg.days.forEach((d) => {
      const tl = d.tracks.filter((t) => t.length > 1);
      const dist = tl.reduce((s, l) => s + SMART.lineLength(l), 0);
      const times = tl.flat().map((p) => p[2]).filter((t) => t > 1e11);
      const span = Math.max(0, toMin(d.endTime) - toMin(d.startTime));
      const day = {
        no: days.length + 1, date: d.date, transport: lg.transport, distance: dist,
        start: times.length ? clock(Math.min(...times)) : d.startTime.substr(0, 5),
        end: times.length ? clock(Math.max(...times)) : d.endTime.substr(0, 5),
        rest: d.restMinutes, active: Math.max(0, span - d.restMinutes), nObs: 0, color: DAY_COLORS[days.length % DAY_COLORS.length]
      };
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
    const groups = tops.map((t) => {
      const items = observations.filter((o) => o.top === t).sort((a, b) => (a.wp.date + a.wp.time).localeCompare(b.wp.date + b.wp.time));
      const subs = [];
      for (const o of items) { let s = subs.find((x) => x.key === o.category); if (!s) subs.push((s = { key: o.category, label: o.catLabel, n: 0 })); s.n++; }
      const species = new Map();
      for (const o of items.filter((x) => x.species)) {
        const k = o.speciesKey || o.species;
        if (!species.has(k)) species.set(k, { name: o.species, records: 0, total: 0, unit: o.unit });
        const s = species.get(k); s.records++; if (o.count != null) s.total += o.count;
      }
      return { top: t, label: items[0].topLabel, color: color[t], items, subs, species: [...species.values()].sort((a, b) => b.records - a.records) };
    });

    // Foto: aktivitas manusia tampil di Bab III, keanekaragaman hayati di Lampiran C, sisanya Lampiran B
    let fig = 0;
    photos.forEach((p) => {
      p.place = p.ob.top === "aktivitasmanusia" ? "hasil" : BIODIV.includes(p.ob.top) || p.ob.species ? "biodiv" : "kegiatan";
    });
    photos.filter((p) => p.place === "hasil").forEach((p) => (p.fig = ++fig));

    const uniq = (arr) => [...new Set(arr.filter(Boolean))];
    const sortNum = (a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0) || String(a).localeCompare(String(b));
    return {
      patrol, members, leader, days, observations, waypoints, groups, photos, dayLines, color, tops,
      grids: uniq(waypoints.map((w) => w.grid)).sort(sortNum), zonas: uniq(waypoints.map((w) => w.zona)), resorts: uniq(waypoints.map((w) => w.resort)),
      hasLayers: { grid: !!gridLayer, zonasi: !!zonaLayer, resort: !!resortLayer },
      totals: {
        distance: days.reduce((s, d) => s + d.distance, 0), active: days.reduce((s, d) => s + d.active, 0),
        days: new Set(days.map((d) => d.date)).size, obs: observations.length, wps: waypoints.length, photos: photos.length
      },
      unknown: L.unknown, labeler: L
    };
  }

  /* ---------- Info kegiatan turunan ---------- */
  function deriveInfo(M, info, profile) {
    const p = M.patrol;
    const sumberAttr = (p.attributes || []).find((a) => a.key === "sumberanggaran");
    const mulai = info.tglMulai || p.startDate, selesai = info.tglSelesai && info.tglSelesai >= mulai ? info.tglSelesai : (info.tglMulai && info.tglMulai > p.endDate ? info.tglMulai : p.endDate);
    const year = (mulai || "").substr(0, 4);
    const dipa = (window.SRG_DIPA || {})[year] || {};
    const looksST = /^ST\.|\/T\.\d+\//i.test(p.id || "");
    const judul = info.judul || p.mandate || "SMART Patrol";
    const lokasi = info.lokasi || p.station || "";
    const grids = info.grids || (M.grids.length ? M.grids.join(", ") : "");
    const penyusun = M.members.find((m) => String(m.employeeId) === String(info.penyusunNip)) || M.leader || M.members[0];
    return {
      judul, lokasi, judulLengkap: `${judul} di Wilayah Kerja ${lokasi}`, grids,
      gridText: grids ? `Grid ${grids.replace(/,\s*([^,]+)$/, ", dan $1")}` : "",
      resort: info.resort || M.resorts.join(", "),
      sumberAnggaran: dipa.sumber || (sumberAttr ? (M.labeler.find(sumberAttr.value) || sumberAttr.value) + (year ? ` TA.${year}` : "") : ""),
      anggaran: rupiah(info.anggaran), tanggalST: info.tanggalST || "", nomorDipa: dipa.nomor || "", tanggalDipa: dipa.tanggal || "",
      nomorST: (info.nomorST || "").trim() || (looksST ? p.id : ""), mulai, selesai, hari: Math.round((parseISO(selesai) - parseISO(mulai)) / 864e5) + 1,
      tanggalLaporan: info.tanggalLaporan || addDays(selesai, 3), kota: info.tempatTtd || profile.kota || "", penyusun,
      rencanaHari: Math.max(0, Number(info.rencanaHari ?? 1)), year
    };
  }

  /* ---------- Teks otomatis (bisa diedit di laporan) ---------- */
  function autoNotes(M, I) {
    const p = M.patrol, t = M.totals;
    const where = I.gridText ? ` yang difokuskan pada ${I.gridText}` : "";
    const g = (top) => M.groups.find((x) => x.top === top);
    const notes = {
      latar: [
        "Taman Nasional Tambora merupakan kawasan konservasi yang ditetapkan untuk melindungi keunikan ekosistem pasca letusan tahun 1815, melalui Keputusan Menteri Lingkungan Hidup dan Kehutanan No. SK. 111/Menlhk-II/2015 dengan luas 71.645,64 hektar. Kawasan ini dikelola oleh Balai Taman Nasional Tambora untuk mempertahankan nilai-nilai konservasi sumber daya alam hayati dan ekosistemnya.",
        `Pengelolaan kawasan dibagi ke dalam beberapa wilayah kerja, salah satunya ${I.lokasi}. Tekanan terhadap kawasan, seperti perambahan, pembalakan liar, perburuan satwa, dan kebakaran hutan dan lahan, menuntut pola pengamanan yang berbasis data dan teknologi.`,
        `Oleh karena itu, dilaksanakan kegiatan ${I.judulLengkap} pada tanggal ${periode(I.mulai, I.selesai)}${where}. Dengan metode Spatial Monitoring and Reporting Tool (SMART), setiap temuan di lapangan dapat terdeteksi secara dini, terdokumentasi secara akurat, dan ditindaklanjuti secara cepat.`
      ].join("\n"),
      maksud: [
        `Kegiatan ${I.judulLengkap} dimaksudkan sebagai upaya pengamanan dan pemantauan kawasan Taman Nasional Tambora secara terukur dan berbasis data${where ? `, khususnya pada ${I.gridText}` : ""}.`,
        "Adapun tujuan kegiatan ini adalah:",
        "1. Mendeteksi dan mendokumentasikan aktivitas manusia dan gangguan kawasan secara dini;",
        "2. Mengumpulkan data keanekaragaman hayati, kondisi ekosistem, dan tutupan lahan;",
        "3. Memeriksa kondisi sarana prasarana dan batas kawasan;",
        "4. Menyediakan data spasial yang valid sebagai dasar pengambilan kebijakan pengelolaan kawasan."
      ].join("\n"),
      ruanglingkup: [
        `Ruang lingkup kegiatan secara kewilayahan mencakup wilayah kerja ${I.lokasi}, Balai Taman Nasional Tambora${I.gridText ? `, khususnya pada ${I.gridText}` : ""}. Ruang lingkup materi kegiatan meliputi:`,
        "1. Melakukan pelacakan dan pendataan terhadap indikasi aktivitas ilegal di dalam kawasan;",
        "2. Mengamati kondisi tutupan hutan, keberadaan satwa liar dan tumbuhan, serta potensi titik api;",
        "3. Memberikan himbauan kepada masyarakat yang ditemukan beraktivitas di dalam kawasan;",
        "4. Melakukan input data lapangan menggunakan aplikasi SMART Mobile, termasuk titik koordinat dan dokumentasi visual temuan."
      ].join("\n"),
      waktu: `Kegiatan ${I.judulLengkap} ini dilaksanakan selama ${I.hari} (${terbilang(I.hari)}) hari terhitung mulai tanggal ${periode(I.mulai, I.selesai)}${I.gridText ? ` yang meliputi ${I.gridText}` : ""}. Data patroli SMART terekam pada ${t.days} hari pengambilan data dengan total lintasan sepanjang ±${num(t.distance / 1000, 1)} km.`,
      hasil: `Dalam pelaksanaan kegiatan ${I.judulLengkap} didapat hasil berupa temuan terkait ${M.groups.map((x) => x.label).join(", ").replace(/, ([^,]+)$/, ", dan $1")} sebanyak ${t.obs} temuan pada ${t.wps} titik${I.gridText ? ` di ${I.gridText}` : ""}${I.resort ? ` wilayah Resor ${I.resort}` : ""}.`,
      pembahasan: "",
      kesimpulan: "",
      saran: ""
    };
    for (const gr of M.groups) {
      const subs = gr.subs.map((s) => `${s.label.toLowerCase()} (${s.n})`).join(", ");
      const sp = gr.species.length ? ` Tercatat ${gr.species.length} jenis, antara lain ${gr.species.slice(0, 5).map((s) => s.name).join(", ")}.` : "";
      notes["hasil_" + gr.top] = `Selama pelaksanaan patroli, tim mencatat ${gr.items.length} temuan ${gr.label.toLowerCase()} berupa ${subs}.${sp} Berikut adalah titik koordinat temuan tersebut:`;
    }
    const pem = [], kes = [], sar = [];
    const am = g("aktivitasmanusia");
    if (am) {
      pem.push(`Temuan aktivitas manusia sebanyak ${am.items.length} titik (${am.subs.map((s) => s.label.toLowerCase()).join(", ")}) menunjukkan masih adanya tekanan terhadap kawasan yang perlu mendapat perhatian dan pengawasan berkala.`);
      kes.push(`Masih ditemukan ${am.items.length} temuan aktivitas manusia di dalam kawasan, berupa ${am.subs.map((s) => s.label.toLowerCase()).join(", ")}.`);
      sar.push("Melakukan tindak lanjut terhadap temuan aktivitas manusia sesuai prosedur dan meningkatkan intensitas patroli pada lokasi temuan.");
    } else kes.push("Tidak ditemukan aktivitas manusia yang mengganggu kawasan selama patroli.");
    const bio = M.groups.filter((x) => BIODIV.includes(x.top));
    if (bio.length) {
      pem.push(`Pemantauan keanekaragaman hayati mencatat ${bio.map((x) => `${x.species.length || x.items.length} jenis ${x.label.toLowerCase()}`).join(" dan ")}, yang menjadi gambaran kondisi ekosistem di jalur patroli.`);
      kes.push(`Keanekaragaman hayati yang tercatat meliputi ${bio.map((x) => `${x.species.length || x.items.length} jenis ${x.label.toLowerCase()}`).join(" dan ")}.`);
    }
    const inv = g("spesiesinvasif");
    if (inv) sar.push(`Melakukan pemantauan dan pengendalian spesies invasif (${inv.species.slice(0, 3).map((s) => s.name).join(", ")}) di lokasi temuan.`);
    const gc = g("groundcheck");
    if (gc) pem.push(`Hasil ground check pada ${gc.items.length} titik memberikan data kondisi tipe ekosistem dan tutupan lahan aktual sebagai baseline pemantauan kawasan.`);
    pem.push(`Tim menempuh lintasan sepanjang ±${num(t.distance / 1000, 1)} km pada ${t.days} hari pengambilan data dengan moda ${[...new Set(M.days.map((d) => d.transport).filter(Boolean))].join(", ") || "jalan kaki"}.`);
    sar.push("Melanjutkan patroli rutin pada jalur dan grid yang sama untuk pemantauan berkala.");
    notes.pembahasan = pem.map((x, i) => `${i + 1}. ${x}`).join("\n");
    notes.kesimpulan = `Berdasarkan seluruh rangkaian kegiatan ${I.judulLengkap} yang dilaksanakan, dapat disimpulkan bahwa: ` + kes.join(" ");
    notes.saran = ["Adapun saran yang dapat diberikan dari hasil patroli yang sudah dilaksanakan adalah sebagai berikut:", ...sar.map((x, i) => `${i + 1}. ${x}`)].join("\n");
    return notes;
  }

  /* ---------- Kesiapan data ---------- */
  function readiness(M, I, info, profile) {
    const missingDir = M.members.filter((m) => !m.inDirectory && !m.manualOk);
    return [
      { label: "File ekspor patroli SMART", ok: true, note: `${M.totals.wps} titik, ${M.totals.photos} foto` },
      { label: "Data Model SMART (nama kategori dan jenis)", ok: M.unknown.size === 0, note: M.unknown.size ? `${M.unknown.size} kode belum punya nama` : "semua kode punya nama" },
      { label: "Judul kegiatan (mandat patroli)", ok: !!(info.judul || M.patrol.mandate), note: `"${I.judul}"` },
      { label: "Tanggal Surat Tugas", ok: !!I.tanggalST },
      { label: `DIPA TA.${I.year}`, ok: !!(I.nomorDipa && I.tanggalDipa), note: I.nomorDipa ? I.nomorDipa : "belum ada di data/dipa.json" },
      { label: "Jumlah anggaran", ok: !!I.anggaran },
      { label: "Nomor Surat Tugas", ok: !!I.nomorST, note: I.nomorST || "ID patroli bukan nomor ST, isi manual" },
      { label: "Tanggal pelaksanaan sesuai ST", ok: !!(info.tglMulai && info.tglSelesai), note: `${periodeSd(I.mulai, I.selesai)}${info.tglMulai ? "" : " (sementara dari data SMART)"}` },
      { label: "Nama bergelar dan jabatan anggota", ok: !missingDir.length, note: missingDir.length ? `isi manual: ${missingDir.map((m) => m.smartName).join(", ")}` : "" },
      { label: "Kepala Balai dan Kasubbag TU (nama, NIP)", ok: !!(profile.kepalaBalaiNama && profile.kepalaBalaiNip && profile.kasubbagNama && profile.kasubbagNip) },
      { label: "Logo Balai untuk sampul", ok: !!profile.logo },
      { label: "Lapisan grid dan zonasi", ok: (M.hasLayers.grid && M.hasLayers.zonasi) || !!info.grids, note: M.hasLayers.grid ? `grid: ${M.grids.join(", ") || "-"}${M.zonas.length ? "; " + M.zonas.join(", ") : ""}` : info.grids ? "diisi manual" : "" },
      { label: "Tempat dan tanggal penandatanganan", ok: !!info.tanggalLaporan, note: `${I.kota || "…"}, ${info.tanggalLaporan ? tglPanjang(I.tanggalLaporan) : "sementara " + tglPanjang(I.tanggalLaporan)}` },
      { label: "Narasi Bab I–IV sudah diperiksa", ok: !!info.narasiOk, note: "centang setelah teks diperiksa" }
    ];
  }

  /* ---------- HTML ---------- */
  const xy = (v) => (isFinite(v) ? v.toFixed(6) : "");

  function noteBlock(notes, key, cls = "para") {
    return `<div class="note ${cls}" contenteditable="true" data-note="${key}">${esc(notes[key] || "").replace(/\n/g, "<br>")}</div>`;
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
    // Kolom mengikuti tabel LPK; kategori lain memakai maksimal 5 atribut terpenting
    const PREF = {
      aktivitasmanusia: ["tipetemuan", "jumlah", "satuan", "keterangan"],
      satwaliar: ["jenissatwa", "jumlah", "tipetemuan"],
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

  function renderHTML(M, profile, info, notes, maps, photoUrls) {
    const I = deriveInfo(M, info, profile), p = M.patrol, t = M.totals;
    const out = [], toc = [];
    const h1 = (txt, id) => { toc.push({ lvl: 1, txt: txt.replace(/<br>/g, " ") }); return `<h1 class="pb" id="${id}">${txt}</h1>`; };
    const h2 = (txt) => { toc.push({ lvl: 2, txt }); return `<h2>${esc(txt)}</h2>`; };
    const balai = profile.balai || "Balai Taman Nasional Tambora";
    const pengesahanTgl = tglPanjang(I.tanggalLaporan);
    const bulanTahun = (() => { const d = parseISO(I.tanggalLaporan); return `${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`; })();

    /* Sampul */
    const front = [];
    front.push(`<div class="cover">
      <p class="cv-title">LAPORAN PELAKSANAAN KEGIATAN<br>${esc(I.judul.toUpperCase())}<br>DI WILAYAH KERJA ${esc(I.lokasi.toUpperCase())}<br>${esc(balai.toUpperCase())}</p>
      ${profile.logo ? `<img class="cv-logo" src="${profile.logo}" alt="">` : `<div class="cv-logo nologo">Logo Balai<br>(atur di Profil Balai)</div>`}
      <p class="cv-by">OLEH:<br>TIM PELAKSANA KEGIATAN</p>
      <p class="cv-st">${esc(I.nomorST || "ST. ……………")}<br>${esc(periodeSd(I.mulai, I.selesai).toUpperCase())}</p>
      <p class="cv-place">${esc((I.kota || "………").toUpperCase())}, ${esc(bulanTahun.toUpperCase())}</p></div>`);

    /* Lembar pengesahan */
    toc.push({ lvl: 1, txt: "LEMBAR PENGESAHAN" });
    const kv = [
      ["Judul Kegiatan", I.judulLengkap], ["Waktu Kegiatan", periodeSd(I.mulai, I.selesai)], ["Lokasi Kegiatan", I.lokasi],
      ["Pelaksana", M.members.map((m, i) => `${i + 1}. ${m.name}`).join("\n")], ["Jumlah Anggaran", I.anggaran || "Rp. ……………"],
      ["Sumber Anggaran", I.sumberAnggaran || "……………"], ["Disusun di", I.kota || "……………"], ["Pada Tanggal", pengesahanTgl], ["Oleh", "Tim Pelaksana Kegiatan"]
    ];
    front.push(`<h1 class="pb ctr" id="pengesahan">LEMBAR PENGESAHAN</h1>
      <table class="kv-plain">${kv.map(([k, v]) => `<tr><td>${esc(k)}</td><td>:</td><td>${esc(v).replace(/\n/g, "<br>")}</td></tr>`).join("")}</table>
      <table class="sign"><tr><td>${sign(["Menyetujui", profile.kasubbagJabatan || "Kepala Sub Bagian Tata Usaha,"], profile.kasubbagNama, profile.kasubbagNip)}</td>
      <td>${sign(["", "Tim Kegiatan"], I.penyusun ? I.penyusun.name : "", I.penyusun ? I.penyusun.nip : "")}</td></tr>
      <tr><td colspan="2">${sign(["Mengetahui", "Kepala Balai,"], profile.kepalaBalaiNama, profile.kepalaBalaiNip)}</td></tr></table>`);

    /* Bab I */
    const body = [];
    body.push(h1("BAB I<br>PENDAHULUAN", "bab1"), h2("A. Latar Belakang"), noteBlock(notes, "latar"), h2("B. Maksud dan Tujuan"), noteBlock(notes, "maksud"), h2("C. Ruang Lingkup"), noteBlock(notes, "ruanglingkup"));

    /* Bab II */
    const dasar = lines(profile.dasarHukum);
    if (I.nomorDipa) dasar.push(`Pengesahan Daftar Isian Pelaksanaan Anggaran Tahun Anggaran ${I.year} Nomor ${I.nomorDipa}${I.tanggalDipa ? ` tanggal ${tglPanjang(I.tanggalDipa)}` : ""};`);
    dasar.push(`Surat Tugas Nomor : ${I.nomorST || "……………"}${I.tanggalST ? ` tanggal ${tglPanjang(I.tanggalST)}` : ""} untuk melaksanakan Kegiatan ${I.judulLengkap}.`);
    body.push(h1("BAB II<br>PELAKSANAAN KEGIATAN", "bab2"), h2("A. Dasar Hukum"),
      `<p class="para">Berikut adalah aturan-aturan yang digunakan sebagai dasar hukum pelaksanaan kegiatan ${esc(I.judul)}:</p>`,
      `<ol class="list">${dasar.map((d) => `<li>${esc(d.replace(/^\d+[.)]\s*/, ""))}</li>`).join("")}</ol>`,
      h2("B. Waktu dan Tempat Pelaksanaan"), noteBlock(notes, "waktu"),
      `<table class="data"><thead><tr><th>Hari</th><th>Tanggal</th><th>Jam</th><th>Jarak (km)</th><th>Temuan</th></tr></thead><tbody>${M.days.map((d) => `<tr><td class="c">${d.no}</td><td>${esc(tglPanjang(d.date, true))}</td><td class="c">${d.start}–${d.end}</td><td class="r">${num(d.distance / 1000, 2)}</td><td class="r">${d.nObs}</td></tr>`).join("")}<tr class="total"><td></td><td colspan="2">Total</td><td class="r">${num(t.distance / 1000, 2)}</td><td class="r">${t.obs}</td></tr></tbody></table>`,
      h2("C. Metode Kegiatan"),
      `<p class="para">Pelaksanaan Kegiatan ${esc(I.judulLengkap)} dilaksanakan berdasarkan Surat Keputusan Direktur Jenderal Konservasi Sumber Daya Alam dan Ekosistem Nomor 74 Tahun 2025 tentang Panduan Patroli Berbasis Spatial Monitoring and Reporting Tool (SMART):</p>`,
      `<ol class="list">${lines(profile.metode).map((d) => `<li>${esc(d.replace(/^\d+[.)]\s*/, ""))}</li>`).join("")}</ol>`,
      h2("D. Tim Pelaksana Kegiatan"),
      `<p class="para">Tim pelaksana Kegiatan ${esc(I.judulLengkap)} terdiri dari:</p>`,
      `<p class="sub">Petugas ${esc(balai)} sebanyak ${M.members.length} orang.</p>`,
      `<table class="data" data-block="tabel_anggota"><thead><tr><th>No</th><th>Nama</th><th>Nomor Induk Pegawai</th><th>Jabatan</th></tr></thead><tbody>${M.members.map((m, i) => `<tr><td class="c">${i + 1}</td><td>${esc(m.name)}${m.isLeader ? " <i>(Ketua Tim)</i>" : ""}</td><td>${esc(m.nip || "-")}</td><td>${esc(m.jabatan || "-")}</td></tr>`).join("")}</tbody></table>`);

    // Tata waktu (gantt)
    const g0 = addDays(I.mulai, -I.rencanaHari), g1 = I.tanggalLaporan < I.selesai ? I.selesai : I.tanggalLaporan;
    const gdays = [];
    for (let d = g0; d <= g1 && gdays.length < 45; d = addDays(d, 1)) gdays.push(d);
    const months = [];
    gdays.forEach((d) => { const m = BULAN[parseISO(d).getUTCMonth()]; const last = months[months.length - 1]; if (last && last.m === m) last.n++; else months.push({ m, n: 1 }); });
    const rows = [
      [`Penyusunan Rencana Pelaksanaan Kegiatan ${I.judul}`, g0, addDays(I.mulai, -1)],
      [`Pelaksanaan Kegiatan ${I.judul}`, I.mulai, I.selesai],
      [`Penyusunan Laporan Kegiatan ${I.judul}`, addDays(I.selesai, 1), I.tanggalLaporan]
    ];
    body.push(h2("E. Tata Waktu Pelaksanaan"), `<p class="para">Tata waktu pelaksanaan Kegiatan ${esc(I.judulLengkap)} adalah sebagai berikut:</p>`,
      `<table class="data gantt"><thead><tr><th rowspan="2">No</th><th rowspan="2">Jenis Kegiatan</th>${months.map((m) => `<th colspan="${m.n}">${m.m}</th>`).join("")}</tr><tr>${gdays.map((d) => `<th class="d">${parseISO(d).getUTCDate()}</th>`).join("")}</tr></thead><tbody>${rows.map((r, i) => `<tr><td class="c">${i + 1}.</td><td>${esc(r[0])}</td>${gdays.map((d) => `<td class="${d >= r[1] && d <= r[2] ? "on" : ""}"></td>`).join("")}</tr>`).join("")}</tbody></table>`);

    /* Bab III */
    body.push(h1("BAB III<br>HASIL DAN PEMBAHASAN", "bab3"), h2("A. Hasil"), noteBlock(notes, "hasil"), `<div class="blk" data-block="tabel_temuan">`);
    let fig = 0;
    M.groups.forEach((gr, gi) => {
      const C = columnsFor(gr, M);
      body.push(`<h3>${gi + 1}. ${esc(gr.label)}</h3>`, noteBlock(notes, "hasil_" + gr.top));
      const hasilPhotos = gr.items.flatMap((o) => o.photos).filter((ph) => ph.place === "hasil");
      if (hasilPhotos.length) {
        body.push(`<div class="photos">${hasilPhotos.map((ph) => { const o = ph.ob; ph.fig = ++fig; return photoFig(ph, photoUrls.get(ph.file), `Gambar ${fig}. ${esc(o.catLabel)}${o.attrs.find((a) => a.key === "tipetemuan") ? " – " + esc(o.attrs.find((a) => a.key === "tipetemuan").text) : ""}${o.wp.grid ? ` di Grid ${esc(o.wp.grid)}` : ""}${o.wp.zona ? ` (${esc(o.wp.zona)})` : ""}`); }).join("")}</div>`);
      }
      body.push(`<table class="data detail"><thead><tr><th>No</th><th>Tanggal</th><th>X</th><th>Y</th>${C.multi ? "<th>Jenis Temuan</th>" : ""}${C.grid ? "<th>Grid</th>" : ""}${C.zona ? "<th>Zona</th>" : ""}${C.heads.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>
        ${gr.items.map((o, i) => `<tr><td class="c">${i + 1}</td><td>${esc(tglPanjang(o.wp.date))}</td><td>${xy(o.wp.x)}</td><td>${xy(o.wp.y)}</td>${C.multi ? `<td>${esc(o.catLabel)}</td>` : ""}${C.grid ? `<td>${esc(o.wp.grid || "-")}</td>` : ""}${C.zona ? `<td>${esc(o.wp.zona || "-")}</td>` : ""}${C.keys.map((k) => { const a = o.attrs.find((x) => x.key === k); return `<td>${a ? esc(a.text) : "-"}</td>`; }).join("")}</tr>`).join("")}</tbody></table>`);
    });
    body.push(`</div>`, h2("B. Pembahasan"), noteBlock(notes, "pembahasan"));

    /* Bab IV */
    body.push(h1("BAB IV<br>PENUTUP", "bab4"), h2("A. Kesimpulan"), noteBlock(notes, "kesimpulan"), h2("B. Saran"), noteBlock(notes, "saran"));
    body.push(`<table class="sign right" data-block="tanda_tangan"><tr><td></td><td>${sign([`Dibuat di ${I.kota || "………"}`, `Pada Tanggal ${pengesahanTgl}`, "Tim Pelaksana"], I.penyusun ? I.penyusun.name : "", I.penyusun ? I.penyusun.nip : "")}</td></tr></table>`);

    /* Lampiran */
    toc.push({ lvl: 1, txt: "LAMPIRAN" });
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
    if (bio.length) body.push(`<div class="photos" data-block="foto">${bio.map((ph) => photoFig(ph, photoUrls.get(ph.file), esc(ph.ob.species || ph.ob.catLabel))).join("")}</div>`);
    else body.push(`<p class="para">Tidak ada foto keanekaragaman hayati.</p>`);


    /* Daftar isi */
    toc.splice(1, 0, { lvl: 1, txt: "DAFTAR ISI" });
    const tocHtml = `<h1 class="pb ctr" id="daftarisi">DAFTAR ISI</h1><div class="toc">${toc.map((x) => `<div class="toc-${x.lvl}">${esc(x.txt)}</div>`).join("")}</div>`;

    out.push(`<section class="sec-front">${front.join("\n")}${tocHtml}</section>`, `<section class="sec-body">${body.join("\n")}</section>`);
    return { html: out.join("\n"), info: I };
  }

  window.SRGReport = { buildModel, renderHTML, autoNotes, deriveInfo, readiness, periode, periodeSd, tglPanjang, num, hhmm, fmtNip, esc, lines, DAY_COLORS, BIODIV };
})();
