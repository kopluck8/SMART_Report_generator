/*
 * Antarmuka: memuat file, data kegiatan, profil Balai, lapisan peta, kamus, dan ekspor.
 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const R = window.SRGReport;

  /* ---------- Penyimpanan ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("srg:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("srg:" + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };
  // IndexedDB untuk data besar (lapisan peta, scan, foto tambahan)
  const idb = (() => {
    let dbp = null;
    const open = () => dbp || (dbp = new Promise((res, rej) => {
      try { const r = indexedDB.open("srg", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }
      catch (e) { rej(e); }
    }));
    const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction("kv", mode); const r = fn(t.objectStore("kv")); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }); };
    return {
      get: (k) => tx("readonly", (s) => s.get(k)).catch(() => undefined),
      set: (k, v) => tx("readwrite", (s) => s.put(v, k)).catch(() => undefined)
    };
  })();

  const DEFAULT_DASAR = [
    "Undang-Undang Nomor 5 Tahun 1990 tentang Konservasi Sumber Daya Alam Hayati dan Ekosistemnya juncto Undang-Undang Nomor 32 Tahun 2024 tentang Perubahan atas Undang-Undang Nomor 5 Tahun 1990 tentang Konservasi Sumber Daya Alam Hayati dan Ekosistemnya;",
    "Undang-Undang Nomor 41 Tahun 1999 tentang Kehutanan sebagaimana telah diubah dengan Undang-Undang Nomor 19 Tahun 2004 tentang Penetapan Peraturan Pemerintah Pengganti Undang-Undang Nomor 1 Tahun 2004 tentang Perubahan atas Undang-Undang Nomor 41 Tahun 1999 tentang Kehutanan menjadi Undang-Undang;",
    "Undang-Undang Nomor 18 Tahun 2013 tentang Pencegahan dan Pemberantasan Perusakan Hutan;",
    "Undang-Undang Nomor 6 Tahun 2023 tentang Penetapan Peraturan Pemerintah Pengganti Undang-Undang Nomor 2 Tahun 2022 tentang Cipta Kerja menjadi Undang-Undang;",
    "Peraturan Pemerintah Nomor 34 Tahun 2002 tentang Tata Hutan dan Penyusunan Rencana Pengelolaan Hutan, Pemanfaatan Hutan dan Penggunaan Kawasan Hutan;",
    "Peraturan Pemerintah Nomor 45 Tahun 2004 tentang Perlindungan Hutan;",
    "Surat Keputusan Direktur Jenderal Konservasi Sumber Daya Alam dan Ekosistem Nomor 74 Tahun 2025 tentang Panduan Patroli Berbasis Spatial Monitoring And Reporting Tool (SMART) tanggal 6 Mei 2025;",
    "Surat Edaran Direktur Jenderal Konservasi Sumber Daya Alam dan Ekosistem Nomor SE.6/KSDAE/PKK/KSA.1/12/2022 tentang Pedoman Pelaksanaan dan Pelaporan Hasil Kegiatan Patroli di Kawasan Konservasi;"
  ].join("\n");
  const DEFAULT_METODE = [
    "Bergerak dari satu tempat ke tempat lain dengan berjalan kaki dan/atau menggunakan kendaraan sesuai dengan target (rencana patroli) yang ditentukan.",
    "Pembaharuan informasi dan status tim di lapangan disampaikan oleh Ketua Tim Patroli kepada Pimpinan secara berjenjang di setiap kesempatan, minimal 3 hari sekali.",
    "Jalur dan temuan patroli direkam dalam GPS menggunakan format derajat desimal (Decimal Degree/DD).",
    "Segala bentuk temuan di lapangan yang terkait dengan aktivitas ilegal, tumbuhan, satwa liar, potensi wisata alam, pal batas kawasan, gejala alam, dan lain-lainnya wajib direkam dengan menggunakan aplikasi SMART Mobile pada smartphone atau secara manual menggunakan alat GPS, kamera, dan buku format pengambilan data. Apabila terdapat kendala pada alat perekaman, dapat dilakukan perekaman manual.",
    "Melakukan observasi secara menyeluruh dengan radius minimal 20 meter di sekitar temuan aktivitas ilegal atau lokasi yang diduga terdapat aktivitas ilegal atau sesuai kebutuhan.",
    "Tim melakukan perekaman data secara konsisten, membuat titik jalur, dan melakukan observasi menyeluruh apabila tim tidak menemukan temuan penting dalam jarak 50 meter atau sesuai dengan kondisi patroli.",
    "Tim juga dapat melakukan pengumpulan data potensi kawasan dan gangguan kawasan, serta data dan informasi lainnya yang dibutuhkan baik yang berada di area hutan maupun sekitar batas luar hutan sesuai dengan data model/struktur data yang ditentukan dalam panduan.",
    "Hal tersebut dapat berupa temuan manusia, penggunaan kawasan hutan secara tidak sah, perburuan satwa liar, illegal logging, akses jalan, kegiatan pemanenan ilegal, dan lain-lain."
  ].join("\n");
  const DEFAULT_PROFILE = {
    balai: "Balai Taman Nasional Tambora", kota: "Dompu", logo: "", kepalaBalaiNama: "", kepalaBalaiNip: "",
    kasubbagJabatan: "Kepala Sub Bagian Tata Usaha,", kasubbagNama: "", kasubbagNip: "", personil: "",
    dasarHukum: DEFAULT_DASAR, metode: DEFAULT_METODE, basemap: "satelit"
  };

  const state = {
    profile: { ...DEFAULT_PROFILE, ...store.get("profile", {}) },
    dmDict: store.get("datamodel", null),
    customDict: store.get("customdict", SMART.emptyDict()),
    layers: [], patrol: null, photoUrls: new Map(), model: null, info: {}, notes: {}, maps: {}, mapKey: ""
  };

  const setStatus = (el, msg, cls = "") => { el.textContent = msg; el.classList.remove("ok", "err"); if (cls) el.classList.add(cls); };
  const busy = (msg) => setStatus($("busy"), msg || "");
  const pid = () => (state.patrol ? state.patrol.id : "");

  /* ---------- Memuat file patroli ---------- */
  async function loadFile(file) {
    setStatus($("loadStatus"), "Membaca " + file.name + "…");
    try {
      revokePhotos();
      if (/\.xml$/i.test(file.name)) return await loadXML(await file.text(), new Map());
      if (!window.JSZip) throw new Error("Pustaka ZIP belum termuat. Periksa koneksi internet lalu muat ulang halaman.");
      const zip = await JSZip.loadAsync(file);
      const entries = Object.values(zip.files).filter((f) => !f.dir);
      let xmlText = null;
      for (const x of entries.filter((f) => /\.xml$/i.test(f.name))) { const t = await x.async("string"); if (/<([\w-]+:)?patrol[\s>]/.test(t)) { xmlText = t; break; } }
      if (!xmlText) throw new Error("Tidak ada file XML patroli di dalam zip.");
      const photos = new Map();
      for (const f of entries.filter((f) => /\.(jpe?g|png|gif|webp)$/i.test(f.name))) {
        const type = /png$/i.test(f.name) ? "image/png" : "image/jpeg";
        photos.set(f.name.split("/").pop(), URL.createObjectURL(new Blob([await f.async("blob")], { type })));
      }
      await loadXML(xmlText, photos);
    } catch (e) { console.error(e); setStatus($("loadStatus"), e.message, "err"); }
  }
  function revokePhotos() { for (const u of state.photoUrls.values()) if (u.startsWith("blob:")) URL.revokeObjectURL(u); state.photoUrls = new Map(); }

  async function loadXML(text, photos) {
    state.patrol = SMART.parsePatrolXML(text);
    state.photoUrls = photos;
    state.mapKey = "";
    const p = state.patrol;
    state.info = store.get("info:" + p.id, {});
    const nWp = p.legs.reduce((s, l) => s + l.days.reduce((a, d) => a + d.waypoints.length, 0), 0);
    setStatus($("loadStatus"), `✓ ${p.id} · ${nWp} titik · ${photos.size} foto`, "ok");
    fillInfoForm();
    await rebuild();
  }

  /* ---------- Kamus ---------- */
  const dicts = () => [state.customDict, state.dmDict || {}, window.SRG_DICTIONARY || {}, window.SRG_DICTIONARY_EXTRA || {}];
  function dictSummary() {
    const c = Object.keys(state.customDict.items).length;
    setStatus($("dictStatus"), (state.dmDict ? "✓ Data Model termuat dari file Anda. " : "Memakai Data Model Balai TN Tambora bawaan. ") + (c ? `${c} nama tambahan Anda.` : ""), "ok");
  }
  async function loadDict(file) {
    try {
      let text, isXml = /\.xml$/i.test(file.name);
      if (/\.zip$/i.test(file.name)) {
        const zip = await JSZip.loadAsync(file);
        const f = Object.values(zip.files).find((x) => /datamodel.*\.xml$|\.xml$/i.test(x.name));
        if (!f) throw new Error("Tidak ada datamodel.xml di dalam zip.");
        text = await f.async("string"); isXml = true;
      } else text = await file.text();
      const d = isXml ? SMART.parseDataModelXML(text) : SMART.parseDictionaryCSV(text);
      if (isXml) { state.dmDict = d; store.set("datamodel", d); }
      else { for (const k of ["items", "categories", "attributes"]) Object.assign(state.customDict[k], d[k]); store.set("customdict", state.customDict); }
      dictSummary();
      if (state.patrol) await rebuild();
    } catch (e) { setStatus($("dictStatus"), e.message, "err"); }
  }
  function openUnknown() {
    const kindLabel = { categories: "Kategori", attributes: "Atribut", items: "Pilihan" };
    const rows = [...state.model.unknown.values()];
    for (const k of ["categories", "attributes", "items"]) for (const key of Object.keys(state.customDict[k])) if (!rows.find((r) => r.key === key)) rows.push({ kind: k, key, guess: "" });
    $("unknownBody").innerHTML = rows.length ? rows.map((r) => `<tr><td>${kindLabel[r.kind]}</td><td>${R.esc(r.key)}</td><td><input data-kind="${r.kind}" data-key="${R.esc(r.key)}" value="${R.esc(state.customDict[r.kind][r.key] || "")}" placeholder="${R.esc(r.guess)}"></td></tr>`).join("") : `<tr><td colspan="3">Semua kode sudah punya nama.</td></tr>`;
    $("unknownDlg").showModal();
  }
  function saveUnknown() {
    for (const inp of $("unknownBody").querySelectorAll("input")) {
      const { kind, key } = inp.dataset, v = inp.value.trim();
      if (v) state.customDict[kind][key] = v; else delete state.customDict[kind][key];
    }
    store.set("customdict", state.customDict);
    dictSummary(); rebuild();
  }
  function exportDict() {
    const rows = ["key,label"], seen = new Set();
    for (const d of [state.customDict, state.dmDict || {}]) for (const k of ["categories", "attributes", "items"]) for (const [key, label] of Object.entries(d[k] || {})) {
      if (seen.has(key)) continue; seen.add(key); rows.push(`${key},"${String(label).replace(/"/g, '""')}"`);
    }
    SRGExport.download(new Blob(["﻿" + rows.join("\r\n")], { type: "text/csv" }), "kamus_smart.csv");
  }

  /* ---------- Lapisan peta ---------- */
  const ROLES = { grid: "Grid", zonasi: "Zonasi", resort: "Resor", batas: "Batas kawasan", jalur: "Jalur", lain: "Lainnya" };
  function prepLayer(fc) {
    for (const f of fc.features) {
      const g = f.geometry; if (!g) continue;
      let b = [Infinity, Infinity, -Infinity, -Infinity];
      const walk = (c) => { if (typeof c[0] === "number") { b = [Math.min(b[0], c[0]), Math.min(b[1], c[1]), Math.max(b[2], c[0]), Math.max(b[3], c[1])]; } else c.forEach(walk); };
      walk(g.coordinates);
      f._bbox = b;
    }
    return fc;
  }
  function guessRole(name, props) {
    const n = (name + " " + Object.keys(props).join(" ")).toLowerCase();
    return /grid/.test(n) ? "grid" : /zon/.test(n) ? "zonasi" : /resor/.test(n) ? "resort" : /batas|boundary|kawasan|tambora/.test(n) ? "batas" : /jalur|jalan|trail|road/.test(n) ? "jalur" : "lain";
  }
  function guessField(props, role) {
    const keys = Object.keys(props);
    const pref = { grid: [/^grid_?id$/i, /grid/i, /^(id|no|kode)$/i], zonasi: [/^zonasi$/i, /zon/i, /nama|name/i], resort: [/^name$/i, /resor/i, /nama|name/i], jalur: [/^tipe$/i, /nama|name/i] };
    for (const re of pref[role] || [/nama|name/i]) { const k = keys.find((x) => re.test(x)); if (k) return k; }
    return keys[0] || "";
  }
  async function addLayer(file) {
    try {
      busy("Membaca lapisan " + file.name + "…");
      let data;
      if (/\.zip$/i.test(file.name)) {
        if (!window.shp) throw new Error("Pustaka shapefile belum termuat (perlu internet).");
        data = await shp(await file.arrayBuffer());
      } else data = JSON.parse(await file.text());
      const list = Array.isArray(data) ? data : [data];
      for (const fc of list) {
        if (!fc.features || !fc.features.length) continue;
        const sample = fc.features.find((f) => f.geometry);
        const c = JSON.stringify(sample.geometry.coordinates).match(/-?\d+\.?\d*/g).slice(0, 2).map(Number);
        if (Math.abs(c[0]) > 180 || Math.abs(c[1]) > 90) throw new Error("Koordinat lapisan bukan derajat (WGS84). Simpan ulang dari QGIS dengan CRS EPSG:4326.");
        const name = (fc.fileName || file.name).replace(/\.(geojson|json|zip)$/i, "");
        const props = sample.properties || {};
        const role = guessRole(name, props);
        state.layers.push({ name, role, field: guessField(props, role), fields: Object.keys(props), ...prepLayer(fc) });
      }
      await saveLayers();
      renderLayers(); state.mapKey = ""; busy(""); await rebuild();
    } catch (e) { console.error(e); busy("Gagal memuat lapisan: " + e.message); }
  }
  // Lapisan bawaan tidak disalin ke penyimpanan; cukup dicatat peran dan kolomnya.
  const saveLayers = () => idb.set("layers", state.layers.map(({ name, role, field, fields, features, builtin }) => builtin ? { name, role, field, builtin } : { name, role, field, fields, features }));
  function defaultLayers() { return (window.SRG_DEFAULT_LAYERS || []).map((l) => prepLayer(JSON.parse(JSON.stringify(l)))); }
  function restoreLayers(saved) {
    if (!saved) return defaultLayers();
    const defs = defaultLayers();
    return saved.map((l) => { if (!l.builtin) return prepLayer(l); const d = defs.find((x) => x.name === l.name); return d ? Object.assign(d, { role: l.role, field: l.field }) : null; }).filter(Boolean);
  }
  function renderLayers() {
    $("layerList").innerHTML = state.layers.map((l, i) => `<div class="layer"><b>${R.esc(l.name)}</b> <small>${l.features.length} fitur</small>
      <div class="row2"><select data-li="${i}" data-k="role">${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${k === l.role ? "selected" : ""}>${v}</option>`).join("")}</select>
      <select data-li="${i}" data-k="field">${l.fields.map((f) => `<option ${f === l.field ? "selected" : ""}>${R.esc(f)}</option>`).join("")}</select></div>
      <button class="btn link" type="button" data-del="${i}">Hapus</button>${l.builtin ? ` <small class="muted">bawaan</small>` : ""}</div>`).join("") || `<p class="muted">Belum ada lapisan.</p>`;
  }
  $("layerList").addEventListener("change", async (e) => {
    const s = e.target.closest("select"); if (!s) return;
    state.layers[s.dataset.li][s.dataset.k] = s.value;
    await saveLayers();
    state.mapKey = ""; rebuild();
  });
  $("layerList").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-del]"); if (!b) return;
    state.layers.splice(Number(b.dataset.del), 1);
    await saveLayers();
    renderLayers(); state.mapKey = ""; rebuild();
  });

  /* ---------- Gambar tambahan ---------- */
  async function shrink(file, max = 1600) {
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    return c.toDataURL("image/jpeg", 0.85);
  }
  /* ---------- Data kegiatan ---------- */
  function fillInfoForm() {
    const M0 = state.patrol;
    const members = [];
    M0.legs.forEach((l) => l.members.forEach((m) => { if (!members.find((x) => x.employeeId === m.employeeId)) members.push(m); }));
    $("i_penyusunNip").innerHTML = `<option value="">Ketua tim</option>` + members.map((m) => `<option value="${R.esc(m.employeeId)}">${R.esc(m.givenName === m.familyName ? m.givenName : m.givenName + " " + m.familyName)}</option>`).join("");
    for (const el of document.querySelectorAll("[data-info]")) {
      const v = state.info[el.dataset.info];
      if (el.type === "checkbox") el.checked = !!v; else el.value = v ?? (el.dataset.info === "rencanaHari" ? 1 : "");
    }
    $("i_judul").placeholder = M0.mandate || "SMART Patrol";
    $("i_lokasi").placeholder = M0.station || "";
    $("i_tempatTtd").placeholder = state.profile.kota || "Dompu";
  }
  let infoTimer;
  $("infoForm").addEventListener("input", (e) => {
    const el = e.target.closest("[data-info]"); if (!el || !state.patrol) return;
    state.info[el.dataset.info] = el.type === "checkbox" ? el.checked : el.value;
    store.set("info:" + pid(), state.info);
    clearTimeout(infoTimer); infoTimer = setTimeout(rebuild, 500);
  });

  /* ---------- Daftar pegawai (Excel) ---------- */
  // Membaca .xlsx tanpa pustaka tambahan: xlsx adalah zip berisi XML.
  async function readXlsx(file) {
    const zip = await JSZip.loadAsync(file);
    const xml = async (p) => { const f = zip.file(p); return f ? new DOMParser().parseFromString(await f.async("string"), "application/xml") : null; };
    const tags = (doc, n) => (doc ? [...doc.getElementsByTagNameNS("*", n)] : []);
    const shared = tags(await xml("xl/sharedStrings.xml"), "si").map((si) => tags(si, "t").map((t) => t.textContent).join(""));
    const wb = await xml("xl/workbook.xml"), rels = await xml("xl/_rels/workbook.xml.rels");
    const sheets = tags(wb, "sheet").map((sh) => {
      const rid = sh.getAttribute("r:id") || sh.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
      const rel = tags(rels, "Relationship").find((r) => r.getAttribute("Id") === rid);
      const target = rel ? rel.getAttribute("Target").replace(/^\/?(xl\/)?/, "") : "";
      return { name: sh.getAttribute("name"), path: "xl/" + target };
    });
    const pick = sheets.find((x) => /pegawai/i.test(x.name)) || sheets[0];
    const doc = await xml(pick.path);
    const colIdx = (ref) => { let n = 0; for (const ch of ref.replace(/\d+/g, "")) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
    return tags(doc, "row").map((row) => {
      const out = [];
      for (const c of tags(row, "c")) {
        const t = c.getAttribute("t"), v = tags(c, "v")[0], is = tags(c, "t");
        out[colIdx(c.getAttribute("r"))] = t === "s" ? shared[Number(v?.textContent)] ?? "" : t === "inlineStr" ? is.map((x) => x.textContent).join("") : v ? v.textContent : "";
      }
      return out.map((x) => (x == null ? "" : String(x).trim()));
    }).filter((r) => r.some(Boolean));
  }
  async function importPegawai(file) {
    const st = $("pegawaiStatus");
    try {
      let rows;
      if (/\.xlsx$/i.test(file.name)) rows = await readXlsx(file);
      else rows = (await file.text()).split(/\r?\n/).map((l) => l.split(/[;,\t]/).map((x) => x.replace(/^"|"$/g, "").trim())).filter((r) => r.some(Boolean));
      const head = rows[0].map((h) => h.toLowerCase());
      const col = (re) => head.findIndex((h) => re.test(h));
      const cNama = col(/nama/), cNip = col(/nip/), cJab = col(/jabatan/), cAktif = col(/aktif/);
      if (cNama < 0 || cNip < 0) throw new Error("Kolom Nama dan NIP tidak ditemukan di baris judul.");
      const bad = [], list = [];
      for (const r of rows.slice(1)) {
        const nama = r[cNama] || "", nip = (r[cNip] || "").replace(/\D/g, ""), jab = cJab >= 0 ? r[cJab] || "" : "";
        if (!nama || /hapus baris ini/i.test(nama)) continue;
        if (cAktif >= 0 && /^t(idak)?$/i.test(r[cAktif] || "")) continue;
        if (nip.length !== 18) bad.push(nama);
        list.push({ nama, nip, jab });
      }
      if (!list.length) throw new Error("Belum ada pegawai di file ini (baris contoh diabaikan).");
      const P = state.profile;
      P.personil = list.map((x) => `${x.nip}; ${x.nama}; ${x.jab}`).join("\n");
      const kb = list.find((x) => /^kepala balai/i.test(x.jab));
      const tu = list.find((x) => /(kepala )?sub ?bag(ian)? tata usaha|kasubbag ?tu|ksbtu/i.test(x.jab));
      if (kb) { P.kepalaBalaiNama = kb.nama; P.kepalaBalaiNip = kb.nip; }
      if (tu) { P.kasubbagNama = tu.nama; P.kasubbagNip = tu.nip; }
      store.set("profile", P);
      for (const el of document.querySelectorAll("[data-prof]")) el.value = P[el.dataset.prof] ?? "";
      setStatus(st, `✓ ${list.length} pegawai dimuat.` + (kb ? "" : " Kepala Balai tidak ditemukan di kolom Jabatan.") + (tu ? "" : " Kasubbag TU tidak ditemukan di kolom Jabatan.") + (bad.length ? ` NIP tidak 18 digit: ${bad.slice(0, 3).join(", ")}${bad.length > 3 ? "…" : ""} (ketik NIP sebagai teks di Excel).` : ""), bad.length || !kb || !tu ? "" : "ok");
      rebuild();
    } catch (e) { console.error(e); setStatus(st, e.message, "err"); }
  }

  /* ---------- Profil ---------- */
  function bindProfile() {
    const P = state.profile;
    for (const el of document.querySelectorAll("[data-prof]")) el.value = P[el.dataset.prof] ?? "";
    let t;
    document.querySelectorAll("[data-prof]").forEach((el) => el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => {
      P[el.dataset.prof] = el.value; store.set("profile", P);
      if (el.dataset.prof === "basemap") state.mapKey = "";
      clearTimeout(t); t = setTimeout(rebuild, 500);
    }));
    $("p_logo").addEventListener("change", async (e) => { const f = e.target.files[0]; if (!f) return; P.logo = await shrink(f, 400); store.set("profile", P); rebuild(); });
    $("clearLogo").addEventListener("click", () => { P.logo = ""; $("p_logo").value = ""; store.set("profile", P); rebuild(); });
    $("exportProfile").addEventListener("click", () => SRGExport.download(new Blob([JSON.stringify(P, null, 1)], { type: "application/json" }), "profil_balai.json"));
    $("importProfile").addEventListener("change", async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { Object.assign(P, JSON.parse(await f.text())); store.set("profile", P); bindValues(); rebuild(); } catch (err) { busy("File profil tidak valid."); }
    });
    const bindValues = () => { for (const el of document.querySelectorAll("[data-prof]")) el.value = P[el.dataset.prof] ?? ""; };
  }

  /* ---------- Narasi ---------- */
  const notesKey = () => "notes:" + pid();
  $("report").addEventListener("input", (e) => {
    const k = e.target.closest("[data-note]"); if (!k) return;
    state.notes[k.dataset.note] = k.innerText.replace(/\n$/, "");
    const saved = store.get(notesKey(), {}); saved[k.dataset.note] = state.notes[k.dataset.note]; store.set(notesKey(), saved);
  });

  /* ---------- Membangun laporan ---------- */
  let building = false, again = false;
  async function rebuild() {
    if (!state.patrol) return;
    if (building) { again = true; return; }
    building = true;
    try {
      const P = { ...state.profile, logo: state.profile.logo || window.SRG_DEFAULT_LOGO || "" };
      state.model = R.buildModel(state.patrol, dicts(), P, state.layers);
      const M = state.model;
      const I = R.deriveInfo(M, state.info, P);
      state.notes = { ...R.autoNotes(M, I), ...store.get(notesKey(), {}) };

      const key = [P.basemap, pid(), state.layers.map((l) => l.name + l.role + l.field).join(), M.groups.map((g) => g.label).join(), I.judulLengkap, I.tanggalLaporan, P.balai, P.logo.length].join("|");
      if (key !== state.mapKey) {
        busy("Menggambar peta…");
        const tracks = M.dayLines.map((l) => ({ coords: l.coords, color: l.color }));
        const faint = M.dayLines.map((l) => ({ coords: l.coords, color: "#ff6f00", alpha: 0.9, width: 0.7 }));
        const layers = state.layers;
        const tahun = (I.tanggalLaporan || M.patrol.endDate || "").substr(0, 4);
        const sources = [`Data patroli SMART ${M.patrol.id}`, "Batas kawasan, zonasi, resor, jalur, dan grid: Balai TN Tambora",
          P.basemap !== "none" ? "Peta dasar: " + (P.basemap === "osm" ? "OpenStreetMap" : "Esri") : ""].filter(Boolean).join("\n");
        const common = { layers, basemap: P.basemap, logo: P.logo, instansi: P.balai || "Balai Taman Nasional Tambora", tahun, sources,
          subtitle: `${I.judulLengkap}\n${M.patrol.id}` };
        const legendDays = M.days.map((d) => ({ type: "line", color: d.color, label: `Hari ${d.no} (${R.tglPanjang(d.date)})` }));
        state.maps = { perTop: {} };
        for (const g of M.groups) {
          const subColors = {};
          const pal = ["#e03131", "#1971c2", "#f08c00", "#2f9e44", "#9c36b5", "#0c8599", "#c2255c", "#5c940d"];
          g.subs.forEach((s, i) => (subColors[s.key] = g.subs.length > 1 ? pal[i % pal.length] : g.color));
          state.maps.perTop[g.top] = await SRGMap.render({
            ...common, title: "Sebaran " + g.label, lines: faint, fit: "points", stat: `Jumlah temuan: ${g.items.length} titik`,
            points: g.items.map((o) => ({ lon: o.wp.x, lat: o.wp.y, color: subColors[o.category] })),
            legend: [{ type: "line", color: "#ff6f00", label: "Lintasan patroli" }, ...g.subs.map((s) => ({ type: "point", color: subColors[s.key], label: `${s.label} (${s.n})` }))]
          });
        }
        state.maps.tracking = await SRGMap.render({ ...common, title: "Tracking Kegiatan", lines: tracks, points: [], legend: legendDays, stat: `Panjang lintasan: ±${R.num(M.totals.distance / 1000, 1)} km` });
        state.mapKey = key;
        busy(P.basemap !== "none" && state.maps.tracking && !state.maps.tracking.tilesOk ? "Peta dasar tidak bisa dimuat (offline atau diblokir); peta dibuat tanpa latar." : "");
      }
      const r = R.renderHTML(M, P, state.info, state.notes, state.maps, state.photoUrls);
      $("report").innerHTML = r.html;
      $("report").hidden = false; $("empty").hidden = true; $("toolbar").hidden = false;
      renderReady(R.readiness(M, I, state.info, P));
      $("unknownBtn").hidden = false;
      $("unknownBtn").textContent = M.unknown.size ? `Lengkapi kamus: ${M.unknown.size} kode belum dikenal` : "Edit kamus label";
    } catch (e) { console.error(e); busy("Gagal menyusun laporan: " + e.message); }
    building = false;
    if (again) { again = false; rebuild(); }
  }

  function renderReady(items) {
    const missing = items.filter((x) => !x.ok && x.note !== "opsional");
    $("ready").hidden = false;
    $("ready").innerHTML = `<div class="ready-head"><b>Kesiapan data laporan</b><span class="pill ${missing.length ? "warn" : "ok"}">${missing.length ? `${missing.length} belum lengkap` : "Siap dibuat final"}</span></div>
      <ul>${items.map((x) => `<li class="${x.ok ? "ok" : x.note === "opsional" ? "opt" : "no"}"><span class="mk">${x.ok ? "✓" : x.note === "opsional" ? "○" : "!"}</span>${R.esc(x.label)}${x.note ? ` <small>${R.esc(x.note)}</small>` : ""}</li>`).join("")}</ul>`;
  }

  /* ---------- Placeholder ---------- */
  function showPlaceholders() {
    const text = Object.keys(SRGExport.textFields(state.model || null, {}, true));
    const blocks = { tabel_anggota: "Tabel tim pelaksana", peta: "Peta tracking", tabel_temuan: "Tabel hasil per kategori", foto: "Dokumentasi keanekaragaman hayati", tanda_tangan: "Blok tanda tangan penyusun" };
    $("phBody").innerHTML = `<h3>Teks (boleh di tengah kalimat)</h3><p>${text.map((t) => `<code>{{${t}}}</code>`).join(" ")}</p><h3>Blok (satu paragraf sendiri)</h3><table class="ktable">${Object.entries(blocks).map(([k, v]) => `<tr><td><code>{{${k}}}</code></td><td>${v}</td></tr>`).join("")}</table>`;
    $("phDlg").showModal();
  }

  async function withBusy(btn, fn) {
    btn.disabled = true;
    try { await fn(); busy(""); } catch (e) { console.error(e); busy("Gagal: " + e.message); } finally { btn.disabled = false; }
  }

  /* ---------- Event ---------- */
  $("fileInput").addEventListener("change", (e) => e.target.files[0] && loadFile(e.target.files[0]));
  const drop = $("drop");
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => e.dataTransfer.files[0] && loadFile(e.dataTransfer.files[0]));
  $("dmInput").addEventListener("change", (e) => e.target.files[0] && loadDict(e.target.files[0]));
  $("layerInput").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) addLayer(f); });
  $("pegawaiInput").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) importPegawai(f); });
  $("resetLayers").addEventListener("click", async () => { state.layers = defaultLayers(); await saveLayers(); renderLayers(); state.mapKey = ""; rebuild(); });
  $("unknownBtn").addEventListener("click", openUnknown);
  $("saveDict").addEventListener("click", saveUnknown);
  $("exportDict").addEventListener("click", exportDict);
  $("phBtn").addEventListener("click", showPlaceholders);
  $("printBtn").addEventListener("click", () => window.print());
  $("docxBtn").addEventListener("click", (e) => withBusy(e.currentTarget, () => SRGExport.docx($("report"), state.model, busy)));
  $("csvBtn").addEventListener("click", () => SRGExport.csv(state.model));
  $("kmlBtn").addEventListener("click", () => SRGExport.kml(state.model));
  $("geoBtn").addEventListener("click", () => SRGExport.geojson(state.model));
  let resetArmed = false;
  $("resetNotes").addEventListener("click", (e) => {
    if (!resetArmed) { resetArmed = true; e.currentTarget.textContent = "Klik lagi untuk mengatur ulang"; setTimeout(() => { resetArmed = false; $("resetNotes").textContent = "Atur ulang narasi"; }, 4000); return; }
    resetArmed = false; $("resetNotes").textContent = "Atur ulang narasi"; store.set(notesKey(), {}); rebuild();
  });
  $("tplInput").addEventListener("change", async (e) => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    if (!state.model) { busy("Muat data patroli dulu sebelum mengisi template."); return; }
    busy("Mengisi template…");
    try { await SRGExport.fillTemplate(await f.arrayBuffer(), $("report"), state.model, state.notes, busy, R.deriveInfo(state.model, state.info, state.profile)); busy("✓ Template terisi dan diunduh."); }
    catch (err) { console.error(err); busy("Gagal mengisi template: " + err.message); }
  });

  // Mode pratinjau (artifact): unduhan dan cetak diblokir oleh bingkai pratinjau
  if (window.SRG_PREVIEW_ONLY) {
    ["printBtn", "docxBtn", "csvBtn", "kmlBtn", "geoBtn"].forEach((id) => ($(id).hidden = true));
    $("tplLabel").hidden = true; $("exportProfile").hidden = true;
    const note = document.createElement("p");
    note.className = "preview-note";
    note.textContent = "Ini versi pratinjau. Tombol cetak/PDF, Word, dan ekspor lain aktif di versi GitHub Pages.";
    $("toolbar").prepend(note);
    if (!store.get("profile", null)) state.profile.basemap = "none";
  }
  if (window.SRG_DEMO) {
    $("demoBtn").hidden = false;
    $("demoBtn").addEventListener("click", () => { revokePhotos(); loadXML(window.SRG_DEMO.xml, new Map(Object.entries(window.SRG_DEMO.photos || {}))); });
  }
  window.SRG_STATE = state; // untuk debugging di konsol
  bindProfile();
  dictSummary();
  (async () => {
    state.layers = restoreLayers(await idb.get("layers"));
    renderLayers();
    if (window.SRG_DEMO && window.SRG_PREVIEW_ONLY) $("demoBtn").click();
  })();
})();
