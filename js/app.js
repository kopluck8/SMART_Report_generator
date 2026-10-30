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

  const DEFAULT_DASAR = R.DEFAULT_DASAR, DEFAULT_METODE = R.DEFAULT_METODE;
  // Profil lama: PP 34/2002 sudah dicabut (PP 6/2007, lalu PP 23/2021); ejaan baku pada metode; dasar RPK disatukan
  function migrateProfile(P) {
    if (P.ver >= 2) return P;
    const oldLpk = /Nomor 34 Tahun 2002/.test(P.dasarHukum || "") && /Nomor 74 Tahun 2025/.test(P.dasarHukum || "") && R.lines(P.dasarHukum).length === 8;
    if (!P.dasarHukum || oldLpk) P.dasarHukum = DEFAULT_DASAR;
    else P.dasarHukum = P.dasarHukum.replace(/^.*Nomor 34 Tahun 2002.*$/m, "Peraturan Pemerintah Nomor 23 Tahun 2021 tentang Penyelenggaraan Kehutanan;");
    P.metode = R.fixText(P.metode || DEFAULT_METODE);
    delete P.dasarHukumRpk;
    P.ver = 2;
    return P;
  }
  const DEFAULT_PROFILE = {
    balai: "Balai Taman Nasional Tambora", kota: "Dompu", logo: "", pegawai: null,
    dasarHukum: DEFAULT_DASAR, metode: DEFAULT_METODE, basemap: "satelit", ver: 2
  };

  const state = {
    profile: migrateProfile({ ...DEFAULT_PROFILE, ...store.get("profile", {}) }),
    dmDict: store.get("datamodel", null),
    customDict: store.get("customdict", SMART.emptyDict()),
    manual: store.get("manualpegawai", {}),
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
    // Isian yang diseragamkan dengan RPK: RAB (bawaan dari RAB RPK terakhir), alat dan bahan, anggota di luar SMART
    if (!state.info.rab) state.info.rab = (store.get("rpk:rab", null) || R.DEFAULT_RAB).map((r) => ({ ...r }));
    if (!state.info.alat) state.info.alat = R.DEFAULT_ALAT.map((r) => ({ ...r }));
    if (!state.info.extra) state.info.extra = [];
    await lpkScans.load();
    const nWp = p.legs.reduce((s, l) => s + l.days.reduce((a, d) => a + d.waypoints.length, 0), 0);
    setStatus($("loadStatus"), `✓ ${p.id} · ${nWp} titik · ${photos.size} foto`, "ok");
    fillInfoForm();
    rabEd.render(); alatEd.render(); renderExtra();
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
    $("i_nomorST").placeholder = /^ST\.|\/T\.\d+\//i.test(M0.id) ? M0.id : "ID patroli: " + M0.id + " (isi nomor ST)";
    $("i_tempatTtd").placeholder = state.profile.kota || "Dompu";
  }
  let infoTimer;
  document.addEventListener("input", (e) => {
    const el = e.target.closest("[data-info]"); if (!el || !state.patrol) return;
    state.info[el.dataset.info] = el.type === "checkbox" ? el.checked : el.value;
    store.set("info:" + pid(), state.info);
    clearTimeout(infoTimer); infoTimer = setTimeout(rebuild, 500);
  });

  /* ---------- Isian yang sama dengan RPK: anggaran, alat, anggota tambahan, scan ST ---------- */
  const saveInfo = (now) => { if (!state.patrol) return; store.set("info:" + pid(), state.info); clearTimeout(infoTimer); infoTimer = setTimeout(rebuild, now ? 0 : 600); };
  const rabEd = SRGUI.rowsEditor($("lRab"), SRGUI.RAB_COLS, () => state.info.rab || [], saveInfo, SRGUI.rabFooter);
  const alatEd = SRGUI.rowsEditor($("lAlat"), SRGUI.ALAT_COLS, () => state.info.alat || [], saveInfo);
  $("lRabAdd").addEventListener("click", () => { if (state.patrol) { const l = state.info.rab[state.info.rab.length - 1]; rabEd.add({ mak: l ? l.mak : "", jenis: "", vol: "", sat: "", harga: "" }); } });
  $("lRabReset").addEventListener("click", () => { if (!state.patrol) return; state.info.rab = R.DEFAULT_RAB.map((r) => ({ ...r })); rabEd.render(); saveInfo(true); });
  $("lAlatAdd").addEventListener("click", () => { if (state.patrol) alatEd.add({ nama: "", jumlah: "", sat: "unit" }); });
  // Anggota yang ikut tetapi tidak tercatat di SMART: dari daftar pegawai atau isian manual dengan unsur
  function renderExtra() {
    const X = state.info.extra || [];
    $("lExtra").innerHTML = X.map((m, i) => `<div class="mem"><div class="who"><b>${R.esc(m.nama)}</b><small>${R.esc(m.nip || "-")} · ${R.esc(R.UNSUR[m.unsur] || "")}${m.jabatan ? " · " + R.esc(m.jabatan) : ""}</small></div><button type="button" class="btn link" data-xdel="${i}">Hapus</button></div>`).join("");
  }
  function addExtra(m) {
    if (!state.patrol) return;
    if (m.nip && state.info.extra.some((x) => x.nip === m.nip)) return;
    state.info.extra.push(m); renderExtra(); saveInfo(true);
  }
  $("lExtra").addEventListener("click", (e) => { const b = e.target.closest("[data-xdel]"); if (!b) return; state.info.extra.splice(Number(b.dataset.xdel), 1); renderExtra(); saveInfo(true); });
  SRGUI.bindPicker($("lSearch"), $("lResults"), () => pegawaiList(), (p) => addExtra({ nama: p.nama, nip: p.nip, pangkat: p.pangkat, jabatan: p.jabatan, unsur: "balai" }), () => (state.info.extra || []).map((m) => m.nip));
  $("lManUnsur").innerHTML = SRGUI.unsurSelect("", "").replace(/^<select >|<\/select>$/g, "");
  $("lManAdd").addEventListener("click", () => {
    const v = {}; document.querySelectorAll("#lManForm [data-m]").forEach((el) => (v[el.dataset.m] = el.value.trim()));
    if (!v.nama) { $("lManForm").querySelector("[data-m=nama]").focus(); return; }
    addExtra({ ...v, unsur: v.unsur || R.guessUnsur(v) || "masyarakat" });
    document.querySelectorAll("#lManForm [data-m]").forEach((el) => (el.value = ""));
  });
  const lpkScans = SRGUI.scanBox({ input: $("lScanInput"), list: $("lScans"), status: $("lScanStatus"), idb, shrink, getKey: () => "lpk:scans:" + pid(), onChange: () => rebuild() });

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
  const pegawaiList = () => state.profile.pegawai || window.SRG_DEFAULT_PEGAWAI || [];
  function pejabat(list) {
    return {
      kb: list.find((x) => /^kepala balai/i.test(x.jabatan)),
      tu: list.find((x) => /(kepala )?sub ?bag(ian)? tata usaha|kasubbag ?tu|ksbtu/i.test(x.jabatan))
    };
  }
  function renderPegawaiInfo() {
    const list = pegawaiList(), { kb, tu } = pejabat(list);
    if (!list.length) { $("pegawaiInfo").innerHTML = `<b>Belum ada daftar pegawai.</b> Impor file pegawai .xlsx sekali di browser ini.`; return; }
    $("pegawaiInfo").innerHTML = `Daftar pegawai: <b>${list.length} orang</b> (${state.profile.pegawai ? "hasil impor" : "bawaan"}).<br>Kepala Balai: <b>${R.esc(kb ? kb.nama : "tidak ditemukan")}</b><br>Kasubbag TU: <b>${R.esc(tu ? tu.nama : "tidak ditemukan")}</b>`;
  }
  // Anggota patroli yang tidak ada di daftar pegawai: isian manual, disimpan per ID SMART
  let manualKey = "";
  function renderManual(M) {
    const miss = M.members.filter((m) => !m.inDirectory && !m.extra);
    const key = miss.map((m) => m.employeeId).join("|");
    if (key === manualKey) return;
    manualKey = key;
    $("manualBox").innerHTML = miss.length ? `<div class="manual"><h3>Anggota di luar daftar pegawai</h3><p class="muted">Isi sekali, tersimpan di browser ini.</p>${miss.map((m) => {
      const v = state.manual[m.employeeId] || {}, id = R.esc(m.employeeId);
      const f = (k, label, ph) => `<label class="fld">${label} <input type="text" data-man="${id}" data-k="${k}" value="${R.esc(v[k] || "")}" placeholder="${R.esc(ph)}"></label>`;
      return `<div class="who">${R.esc(m.smartName)} <small class="muted">(ID SMART ${id})</small></div>${f("nama", "Nama bergelar", m.smartName)}<div class="row2">${f("nip", "NIP / NRP / NIK", m.employeeId)}${f("pangkat", "Pangkat/Gol", "-")}</div>${f("jabatan", "Jabatan", "Anggota Polsek Pekat / MMP")}<label class="fld">Unsur ${SRGUI.unsurSelect(v.unsur || "", `data-man="${id}" data-k="unsur"`)}</label>`;
    }).join("")}</div>` : "";
  }
  let manTimer;
  $("manualBox").addEventListener("change", (e) => { if (e.target.tagName === "SELECT") e.target.dispatchEvent(new Event("input", { bubbles: true })); });
  $("manualBox").addEventListener("input", (e) => {
    const el = e.target.closest("[data-man]"); if (!el) return;
    const rec = state.manual[el.dataset.man] || (state.manual[el.dataset.man] = {});
    rec[el.dataset.k] = el.value.trim();
    store.set("manualpegawai", state.manual);
    clearTimeout(manTimer); manTimer = setTimeout(rebuild, 600);
  });
  $("resetPegawai").addEventListener("click", () => { state.profile.pegawai = null; store.set("profile", state.profile); setStatus($("pegawaiStatus"), ""); renderPegawaiInfo(); rebuild(); });

  async function importPegawai(file) {
    const st = $("pegawaiStatus");
    try {
      let rows;
      if (/\.xlsx$/i.test(file.name)) rows = await readXlsx(file);
      else rows = (await file.text()).split(/\r?\n/).map((l) => l.split(/[;,\t]/).map((x) => x.replace(/^"|"$/g, "").trim())).filter((r) => r.some(Boolean));
      const head = rows[0].map((h) => h.toLowerCase());
      const col = (re) => head.findIndex((h) => re.test(h));
      const cNama = col(/nama/), cNip = col(/nip/), cJab = col(/jabatan/), cAktif = col(/aktif/), cPk = col(/pangkat|gol/);
      if (cNama < 0 || cNip < 0) throw new Error("Kolom Nama dan NIP tidak ditemukan di baris judul.");
      const bad = [], list = [];
      for (const r of rows.slice(1)) {
        const nama = r[cNama] || "", nip = (r[cNip] || "").replace(/\D/g, ""), jab = cJab >= 0 ? r[cJab] || "" : "";
        if (!nama || /hapus baris ini/i.test(nama)) continue;
        if (cAktif >= 0 && /^t(idak)?$/i.test(r[cAktif] || "")) continue;
        if (nip.length !== 18) bad.push(nama);
        list.push({ nama, nip, jabatan: jab, pangkat: cPk >= 0 ? r[cPk] || "" : "" });
      }
      if (!list.length) throw new Error("Belum ada pegawai di file ini (baris contoh diabaikan).");
      const P = state.profile;
      P.pegawai = list;
      const { kb, tu } = pejabat(list);
      store.set("profile", P);
      renderPegawaiInfo();
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
  // Profil lengkap untuk laporan: logo bawaan, daftar pegawai, Kepala Balai dan Kasubbag TU
  function profileView() {
    const list = pegawaiList(), { kb, tu } = pejabat(list);
    return {
      ...state.profile, logo: state.profile.logo || window.SRG_DEFAULT_LOGO || "", pegawai: list, manualPegawai: state.manual,
      kepalaBalaiNama: kb ? kb.nama : "", kepalaBalaiNip: kb ? kb.nip : "", kasubbagJabatan: "Kepala Subbagian Tata Usaha,",
      kasubbagNama: tu ? tu.nama : "", kasubbagNip: tu ? tu.nip : ""
    };
  }
  let building = false, again = false;
  async function rebuild() {
    if (!state.patrol) return;
    if (building) { again = true; return; }
    building = true;
    try {
      const P = { ...profileView(), extraMembers: state.info.extra || [] };
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
      const r = R.renderHTML(M, P, state.info, state.notes, state.maps, state.photoUrls, lpkScans.get());
      $("report").innerHTML = r.html;
      $("report").hidden = false; $("empty").hidden = true; $("toolbar").hidden = false;
      renderReady(R.readiness(M, I, state.info, P, state.notes, lpkScans.get()));
      renderManual(M);
      $("dipaInfo").innerHTML = I.nomorDipa ? `Sumber anggaran: <b>${R.esc(I.sumberAnggaran)}</b><br>DIPA Nomor <b>${R.esc(I.nomorDipa)}</b> tanggal <b>${R.esc(R.tglPanjang(I.tanggalDipa))}</b>` : `DIPA TA.${R.esc(I.year)} belum tercatat di data/dipa.json.`;
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
  $("docxBtn").addEventListener("click", (e) => withBusy(e.currentTarget, () => {
    const I = R.deriveInfo(state.model, state.info, state.profile);
    return SRGExport.docx($("report"), state.model, busy, { title: `LPK ${I.judulLengkap} ${I.nomorST}`.trim(), fileName: `LPK_${SRGExport.safeName(I.nomorST || state.model.patrol.id)}.docx` });
  }));
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
  renderPegawaiInfo();
  dictSummary();
  const layersReady = (async () => {
    state.layers = restoreLayers(await idb.get("layers"));
    renderLayers();
    if (window.SRG_DEMO && window.SRG_PREVIEW_ONLY) $("demoBtn").click();
  })();
  // Dipakai tab RPK: profil, daftar pegawai, lapisan peta, dan penyimpanan yang sama
  window.SRG_APP = { state, store, idb, shrink, pegawaiList, pejabat, profileView, withBusy, layersReady };
})();
