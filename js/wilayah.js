/*
 * Wilayah kerja (SPTN atau resor) dan profil kawasan dari Satu Data Tambora
 * (Kajian Wilayah Kerja Resor 2026, js/profil.js). Dipakai LPK dan RPK untuk:
 * - daftar pilihan wilayah kerja: SPTN Wilayah I Kore, SPTN Wilayah II Pekat, atau salah satu resor;
 * - menebak wilayah dari titik patroli (LPK) atau grid rencana (RPK) memakai batas resor 2026;
 * - menyusun paragraf Umum (kawasan ke wilayah) dan Keadaan Umum Lokasi Kegiatan (khusus wilayah terpilih).
 * Saat dibuka dari internet, kajian terbaru dibaca dari situs Satu Data; bila gagal, salinan bawaan dipakai.
 */
(function () {
  "use strict";
  const R = window.SRGReport;
  const { esc, listText, num } = R;
  const URL_KAJIAN = "https://kopluck8.github.io/Satu-Data-Tambora/data/resor/kajian_2026.json";
  const RESOR_KEYS = ["id", "kode", "nama", "sptn", "luas_ha", "baru", "desa", "kantor", "akses", "potensi", "ancaman", "fokus"];
  let P = window.SRG_PROFIL || { sumber: {}, kawasan: null, sptn: [], resor: [], batas: [] };
  let source = P.kawasan ? "bawaan" : "";

  for (const b of P.batas) {
    let bb = [Infinity, Infinity, -Infinity, -Infinity];
    const walk = (c) => { if (typeof c[0] === "number") bb = [Math.min(bb[0], c[0]), Math.min(bb[1], c[1]), Math.max(bb[2], c[0]), Math.max(bb[3], c[1])]; else c.forEach(walk); };
    walk(b.geometry.coordinates);
    b._bbox = bb;
  }
  // Nama ilmiah di teks profil dicetak miring di narasi
  const addLatin = () => {
    const k = P.kawasan || {};
    ((k.satwa_kunci || {}).jenis || []).forEach((j) => R.LATIN.add(j.ilmiah));
    // Pasangan "Genus epitet" di teks ancaman; kata Indonesia berimbuhan (-an, -nya, -kan) bukan nama ilmiah
    String(k.ancaman || "").replace(/\b([A-Z][a-z]+ [a-z]{4,})\b/g, (m, n) => { const [g, e] = n.split(" "); if (/(us|um|a|is|ii|ae|ensis|ana|ata|ica|osa)$/.test(e) && !/(an|kan|nya)$/.test(g) && !/(nya|kan)$/.test(e)) R.LATIN.add(n); return m; });
  };
  addLatin();

  const sptn = (id) => P.sptn.find((s) => s.id === id) || null;
  const resor = (id) => P.resor.find((r) => r.id === id) || null;
  const resorOf = (sid) => P.resor.filter((r) => r.sptn === sid);
  const ha = (v) => num(v, 2);
  // Huruf kecil di awal frasa untuk kata umum; nama diri (Sanctuary, Air Terjun, HHBK) tidak diubah
  const COMMON = /^(Habitat|Ekosistem|Pendakian|Pengamatan|Fitur|Areal|Sumber|Jalur|Wisata|Savana|Kebakaran|Perburuan|Perambahan|Penebangan|Pendaki|Mobil|Motor|Jalan|Kerawanan|Desa|Pelayanan|Potensi|Akses|Hutan|Pembalakan)\b/;
  const lc = (s) => (COMMON.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
  const desaTxt = (arr) => (arr && arr.length ? "Desa " + listText(arr) : "");
  const aksesTxt = (s) => lc(String(s || "").trim()).replace(/,\s*(?!.*,)/, ", dan ").replace(/,\s*dan\s+dan\s/, ", dan ");

  /* ---------- Pilihan wilayah ---------- */
  function options() {
    const out = [];
    for (const s of P.sptn) {
      out.push({ v: "sptn:" + s.id, label: `${s.nama} (seluruh wilayah SPTN)`, group: s.nama });
      for (const r of resorOf(s.id)) out.push({ v: "resor:" + r.id, label: `Resor ${r.nama}${r.baru ? " (resor baru 2026)" : ""}`, group: s.nama });
    }
    return out;
  }
  // <option> untuk <select>; nilai kosong = otomatis
  function selectHtml(val, autoLabel) {
    const groups = [];
    for (const o of options()) { let g = groups.find((x) => x.label === o.group); if (!g) groups.push((g = { label: o.group, items: [] })); g.items.push(o); }
    return `<option value="">${esc(autoLabel)}</option>` + groups.map((g) => `<optgroup label="${esc(g.label)}">${g.items.map((o) => `<option value="${o.v}"${o.v === val ? " selected" : ""}>${esc(o.label)}</option>`).join("")}</optgroup>`).join("");
  }
  function resolve(v) {
    const [type, id] = String(v || "").split(":");
    if (type === "sptn") {
      const s = sptn(id);
      if (s) return { v, type, sptn: s, resor: null, resors: resorOf(s.id), lokasi: s.nama, nama: s.nama, pelaksana: s.nama };
    }
    if (type === "resor") {
      const r = resor(id), s = r && sptn(r.sptn);
      if (r) return { v, type, sptn: s, resor: r, resors: [r], lokasi: `Resor ${r.nama}${s ? ", " + s.nama : ""}`, nama: `Resor ${r.nama}`, pelaksana: `Resor ${r.nama}` };
    }
    return null;
  }
  function resorAt(x, y) {
    for (const b of P.batas) {
      const bb = b._bbox;
      if (x < bb[0] || x > bb[2] || y < bb[1] || y > bb[3]) continue;
      if (R.inGeom(x, y, b.geometry)) return resor(b.id);
    }
    return null;
  }
  // Wilayah dari titik [x, y]: resor bila minimal 70% titik di satu resor, selain itu SPTN dengan titik terbanyak
  function detect(points) {
    const n = new Map();
    let inside = 0;
    for (const [x, y] of points) { const r = resorAt(x, y); if (!r) continue; inside++; n.set(r.id, (n.get(r.id) || 0) + 1); }
    if (!inside) return null;
    const counts = [...n.entries()].map(([id, c]) => ({ resor: resor(id), n: c, share: c / inside })).sort((a, b) => b.n - a.n);
    let v;
    if (counts[0].share >= 0.7) v = "resor:" + counts[0].resor.id;
    else {
      const by = new Map();
      counts.forEach((c) => by.set(c.resor.sptn, (by.get(c.resor.sptn) || 0) + c.n));
      v = "sptn:" + [...by.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
    return { v, counts, inside, total: points.length };
  }
  // Isian lokasi lama (teks bebas) ke pilihan wilayah
  function fromText(t) {
    const s = String(t || "").toLowerCase(), flat = s.replace(/[^a-z]/g, "");
    if (!s.trim()) return "";
    const r = P.resor.find((x) => flat.includes(x.nama.toLowerCase().replace(/[^a-z]/g, "")));
    if (r) return "resor:" + r.id;
    if (/\bii\b|pekat|dompu/.test(s)) return "sptn:II";
    if (/\bi\b|kore|kadindi|bima/.test(s)) return "sptn:I";
    return "";
  }
  const detectLabel = (d) => (d ? `${resolve(d.v).nama}, ${Math.round(d.counts[0].share * 100)}% titik di Resor ${d.counts[0].resor.nama}` : "");

  /* ---------- Narasi ---------- */
  // Paragraf kawasan (umum): penetapan, letak, kondisi fisik, ekosistem, satwa kunci, dan gangguan
  function kawasanParas() {
    const k = P.kawasan;
    if (!k) return [];
    const f = k.fisik || {}, eko = [...(k.ekosistem || [])].sort((a, b) => b.ha - a.ha).slice(0, 2);
    const kab = (k.kabupaten || []).map((x) => "Kabupaten " + x);
    const sk = String(k.penetapan || "").replace(/^(SK\.[^\s]+)/, "Nomor $1");
    const tanah = f.tanah ? f.tanah.replace(/^./, (c) => c.toLowerCase()).replace(/;\s*/, " yang ") : "";
    const kunci = ((k.satwa_kunci || {}).jenis || []).map((j) => `${j.nama} (${j.ilmiah})`);
    const p1 = [
      `Taman Nasional Tambora ditetapkan melalui Keputusan Menteri Lingkungan Hidup dan Kehutanan ${sk} dengan luas ${ha(k.luas_sk_ha)} hektare, terletak di ${listText(kab)}, Provinsi ${k.provinsi}, dan dikelola oleh Balai Taman Nasional Tambora.`,
      f.puncak_mdpl ? `Kawasan ini merupakan bentang gunung api dengan puncak Gunung Tambora setinggi ${num(f.puncak_mdpl)} mdpl${f.lereng ? ` dan kelerengan ${f.lereng}` : ""}.` : "",
      tanah ? `Jenis tanahnya ${tanah}.` : "",
      eko.length ? `Ekosistem kawasan didominasi ${listText(eko.map((e) => `${lc(e.nama).toLowerCase()} (±${ha(e.ha)} ha)`))}${kunci.length ? `, serta menjadi habitat satwa kunci ${listText(kunci)}` : ""}.` : ""
    ].filter(Boolean).join(" ");
    return [p1, k.ancaman ? `Pengelolaan kawasan masih menghadapi berbagai gangguan. ${k.ancaman}` : ""].filter(Boolean);
  }
  // "Kajian Wilayah Kerja Resor tahun 2026"
  const kajian = () => `Kajian Wilayah Kerja Resor tahun ${String(P.sumber.tanggal || "2026").substr(0, 4)}`;
  // Paragraf wilayah: pembagian SPTN dan resor, lalu ancaman utama wilayah kerja kegiatan
  function wilayahPara(W) {
    if (!P.sptn.length) return "";
    const bagi = P.sptn.map((s) => `${s.nama} (Kabupaten ${s.kabupaten}) yang meliputi Resor ${listText(resorOf(s.id).map((r) => r.nama))}`);
    let s = `Berdasarkan ${kajian()}, pengelolaan kawasan di tingkat tapak terbagi atas ${R.terbilang(P.sptn.length)} Seksi Pengelolaan Taman Nasional (SPTN) dan ${R.terbilang(P.resor.length)} resor, yaitu ${bagi.join(", serta ")}.`;
    if (W) {
      // "perburuan liar" dan "perburuan satwa" dari resor berbeda ditulis satu kali
      const anc = [...new Set(W.resors.flatMap((r) => r.ancaman || []).map((a) => lc(a).replace(/^perburuan liar$/, "perburuan satwa")))].slice(0, 5);
      if (anc.length) s += ` Ancaman utama di wilayah kerja ${W.type === "resor" ? `${W.nama}, ${W.sptn.nama},` : W.nama} meliputi ${listText(anc)}.`;
    }
    return s;
  }
  // Uraian satu resor: luas, desa binaan, kantor, akses, potensi, ancaman
  function resorParas(r, full) {
    const s = sptn(r.sptn);
    const kantor = String(r.kantor || "").replace(/,?\s*rekomendasi lokasi kantor resor\s*$/i, "");
    const a = [];
    a.push(full ? `Lokasi kegiatan berada di Resor ${r.nama}, ${s ? s.nama : ""}, dengan luas wilayah kerja ±${ha(r.luas_ha)} ha.${r.baru ? ` Resor ${r.nama} merupakan resor baru hasil Kajian Wilayah Kerja Resor tahun 2026.` : ""}`
      : `Resor ${r.nama} (±${ha(r.luas_ha)} ha)`);
    const desa = desaTxt(r.desa);
    if (full) {
      if (desa || kantor) a.push(`${desa ? `Desa binaan resor ini adalah ${desa}` : ""}${desa && kantor ? ", dengan " : ""}${kantor ? `${desa ? "" : "Resor ini memiliki "}${r.baru ? "rekomendasi lokasi kantor resor" : "kantor resor"} di ${kantor}` : ""}.`);
      if (r.akses) a.push(`Wilayah resor dapat dijangkau dengan ${aksesTxt(r.akses)}.`);
      const pot = (r.potensi || []).map(lc), anc = (r.ancaman || []).map(lc);
      if (pot.length || anc.length) a.push(`${pot.length ? `Potensi utama resor meliputi ${listText(pot)}` : ""}${pot.length && anc.length ? ", sedangkan ancaman utamanya adalah " : anc.length ? "Ancaman utama resor adalah " : ""}${listText(anc)}.`);
      return a.join(" ");
    }
    const s1 = [desa ? `memiliki desa binaan ${desa}` : "", r.akses ? `dapat dijangkau dengan ${aksesTxt(r.akses)}` : ""].filter(Boolean).join(" serta ");
    const pot = (r.potensi || []).slice(0, 3).map(lc), anc = (r.ancaman || []).map(lc);
    const s2 = `${pot.length ? `Potensi utamanya meliputi ${listText(pot)}` : ""}${pot.length && anc.length ? ", sedangkan ancaman utamanya adalah " : anc.length ? "Ancaman utamanya adalah " : ""}${listText(anc)}`;
    return [s1 ? `${a[0]} ${s1}.` : `${a[0]}.`, s2 ? `${s2}.` : ""].filter(Boolean).join(" ");
  }
  /* Keadaan Umum Lokasi Kegiatan, khusus wilayah terpilih.
   * share: [{resor, share}] resor yang dilalui (dari titik patroli atau grid), untuk pilihan SPTN. */
  function keadaan(W, share, rpk) {
    if (!W) return "";
    if (W.type === "resor") return resorParas(W.resor, true);
    const s = W.sptn, lewat = (share || []).filter((c) => c.share >= 0.1 && c.resor.sptn === s.id).slice(0, 3);
    // Ringkasan kajian yang diawali kata kerja pasif ("Didominasi ...") diberi subjek
    const ringkas = String(s.ringkas || "").replace(/^(Di[a-z]{3,})\b/, (m) => "Wilayah ini " + m.toLowerCase());
    const out = [`Lokasi kegiatan berada di wilayah kerja ${s.nama} (Kabupaten ${s.kabupaten}) dengan luas ±${ha(s.luas_ha)} ha, yang meliputi Resor ${listText(resorOf(s.id).map((r) => r.nama))}. ${ringkas}`.trim()];
    if (lewat.length) {
      out.push(`${rpk ? "Berdasarkan grid rencana, patroli akan berada" : "Berdasarkan titik koordinat yang terekam, jalur patroli berada"} di ${listText(lewat.map((c) => `Resor ${c.resor.nama} (${Math.round(c.share * 100)}%)`))}.`);
      out.push(...lewat.map((c) => resorParas(c.resor, false)));
    }
    return out.join(" ");
  }
  // Desa binaan wilayah (pilihan desa sasaran imbauan)
  const desaOf = (W) => [...new Set((W ? W.resors : P.resor).flatMap((r) => r.desa || []))];
  // Akses dan desa resor dominan, untuk pembahasan aktivitas manusia
  function aksesDesa(W, share) {
    const r = W && W.type === "resor" ? W.resor : share && share[0] ? share[0].resor : null;
    return r ? { resor: r, akses: r.akses ? aksesTxt(r.akses) : "", desa: desaTxt(r.desa) } : null;
  }

  /* ---------- Pembaruan dari situs Satu Data ---------- */
  function valid(k) {
    return !!(k && k.kawasan && k.kawasan.penetapan && k.kawasan.luas_sk_ha && Array.isArray(k.sptn) && k.sptn.length && Array.isArray(k.resor) && k.resor.length
      && k.resor.every((r) => r.id && r.nama && k.sptn.some((s) => s.id === r.sptn) && P.batas.some((b) => b.id === r.id)));
  }
  async function refresh() {
    if (!window.fetch) return false;
    try {
      const ctl = typeof AbortController === "function" ? new AbortController() : null;
      const timer = ctl && setTimeout(() => ctl.abort(), 6000);
      const res = await fetch(URL_KAJIAN, { signal: ctl ? ctl.signal : undefined, cache: "no-cache" });
      if (timer) clearTimeout(timer);
      if (!res.ok) return false;
      const k = await res.json();
      if (!valid(k)) return false;
      const sumber = { judul: k.sumber && k.sumber.judul, penyusun: k.sumber && k.sumber.penyusun, tempat: k.sumber && k.sumber.tempat, tanggal: k.sumber && k.sumber.tanggal };
      const kawasan = { ...k.kawasan }; delete kawasan.sdm; delete kawasan.luas_kajian_ha;
      const changed = JSON.stringify([kawasan, k.sptn.map((s) => s.ringkas), k.resor.map((r) => RESOR_KEYS.map((x) => r[x]))]) !== JSON.stringify([P.kawasan, P.sptn.map((s) => s.ringkas), P.resor.map((r) => RESOR_KEYS.map((x) => r[x]))]);
      P = { ...P, sumber, kawasan, sptn: k.sptn.map((s) => ({ id: s.id, nama: s.nama, kabupaten: s.kabupaten, luas_ha: s.luas_ha, ringkas: s.ringkas, wisata: s.wisata })),
        resor: k.resor.map((r) => Object.fromEntries(RESOR_KEYS.filter((x) => x in r).map((x) => [x, r[x]]))) };
      addLatin();
      source = "situs";
      if (changed) window.dispatchEvent(new CustomEvent("srg:profil"));
      return true;
    } catch (e) { return false; }
  }
  const status = () => (P.kawasan ? `Profil kawasan dan resor: ${P.sumber.judul || "Kajian Wilayah Kerja Resor"} (${source === "situs" ? "versi terbaru dari situs Satu Data Tambora" : "salinan bawaan aplikasi"}).` : "Profil kawasan belum tersedia.");

  window.SRGWilayah = { options, selectHtml, resolve, resorAt, detect, detectLabel, fromText, kawasanParas, wilayahPara, keadaan, desaOf, aksesDesa, refresh, status, kajian,
    get data() { return P; } };
})();
