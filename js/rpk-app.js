/*
 * Tab RPK: form rencana, tim dari daftar pegawai (bisa dicari), PPK, RAB, peta grid rencana, scan Surat Tugas, dan ekspor.
 * Data RPK terpisah dari LPK; yang dipakai bersama hanya Profil Balai, daftar pegawai, dan lapisan peta.
 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const A = window.SRG_APP, R = window.SRGReport, K = window.SRGRpk;
  const { store, idb, esc } = { ...A, esc: R.esc };

  const EMPTY = () => ({ info: {}, team: [] });
  const rs = {
    draft: { ...EMPTY(), ...store.get("rpk:draft", {}) },
    rab: store.get("rpk:rab", null) || K.DEFAULT_RAB.map((r) => ({ ...r })),
    ppk: store.get("rpk:ppk", null),
    notes: {}, scans: [], map: null, mapKey: "", I: null, active: false
  };
  const D = rs.draft;
  const saveDraft = () => store.set("rpk:draft", D);
  const busy = (msg) => { $("rBusy").textContent = msg || ""; };

  /* ---------- Tab ---------- */
  function showTab(t) {
    document.querySelectorAll(".tabs .tab").forEach((b) => { const on = b.dataset.tab === t; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
    $("paneLpk").hidden = t !== "lpk"; $("paneRpk").hidden = t !== "rpk";
    rs.active = t === "rpk";
    store.set("tab", t);
    if (rs.active) rebuild();
  }
  document.querySelector(".tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) showTab(b.dataset.tab); });

  /* ---------- Form rencana ---------- */
  function fillForm() {
    for (const el of document.querySelectorAll("[data-rpk]")) {
      const v = D.info[el.dataset.rpk];
      if (el.type === "checkbox") el.checked = !!v; else el.value = v ?? "";
    }
    document.querySelector('[data-rpk="tempatTtd"]').placeholder = A.state.profile.kota || "Dompu";
    $("rDasar").value = A.state.profile.dasarHukumRpk || K.DEFAULT_DASAR_RPK;
  }
  let t1;
  document.querySelectorAll("[data-rpk]").forEach((el) => el.addEventListener("input", () => {
    D.info[el.dataset.rpk] = el.type === "checkbox" ? el.checked : el.value;
    saveDraft();
    clearTimeout(t1); t1 = setTimeout(rebuild, 500);
  }));
  $("rDasar").addEventListener("input", () => { A.state.profile.dasarHukumRpk = $("rDasar").value; store.set("profile", A.state.profile); clearTimeout(t1); t1 = setTimeout(rebuild, 600); });
  $("rDasarReset").addEventListener("click", () => { delete A.state.profile.dasarHukumRpk; store.set("profile", A.state.profile); $("rDasar").value = K.DEFAULT_DASAR_RPK; rebuild(); });

  /* ---------- Pencarian pegawai ---------- */
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
  // Singkatan jabatan yang biasa dipakai saat mencari: polhut, PEH, kasubbag, SPTN
  const ALIAS = [[/polisi kehutanan/, "polhut"], [/pengendali ekosistem hutan/, "peh"], [/penyuluh kehutanan/, "penyuluh"], [/sub bagian tata usaha/, "kasubbag ksbtu tu"], [/seksi pengelolaan taman nasional/, "sptn kspt"], [/kepala balai/, "kabalai"]];
  const alias = (h) => h + ALIAS.filter(([re]) => re.test(h)).map(([, a]) => " " + a).join("");
  function search(q, exclude = []) {
    const list = A.pegawaiList(), words = norm(q).split(" ").filter(Boolean);
    if (!words.length) return [];
    return list.map((p, i) => ({ ...p, rank: i })).filter((p) => {
      if (exclude.includes(p.nip)) return false;
      const hay = alias(norm(`${p.nama} ${p.nip} ${p.jabatan}`));
      return words.every((w) => hay.includes(w));
    }).slice(0, 10);
  }
  const pickItem = (p) => `<button type="button" class="pick" data-nip="${esc(p.nip)}"><b>${esc(p.nama)}</b><small>${esc(R.fmtNip(p.nip) || "-")} · ${esc(p.jabatan || "-")}</small></button>`;
  function bindPicker(input, box, onPick, exclude) {
    const show = () => {
      const res = search(input.value, exclude());
      box.innerHTML = input.value.trim() ? (res.map(pickItem).join("") || `<p class="muted">Tidak ada pegawai yang cocok.</p>`) : "";
    };
    input.addEventListener("input", show);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); const b = box.querySelector(".pick"); if (b) b.click(); }
      if (e.key === "Escape") { input.value = ""; show(); }
    });
    box.addEventListener("click", (e) => {
      const b = e.target.closest(".pick"); if (!b) return;
      const p = A.pegawaiList().find((x) => x.nip === b.dataset.nip); if (!p) return;
      onPick(p); input.value = ""; show(); input.focus();
    });
  }

  /* ---------- Tim pelaksana ---------- */
  // Urutan tim mengikuti urutan baris daftar pegawai (kepangkatan); anggota manual di bagian akhir
  function teamWithRank() {
    const list = A.pegawaiList();
    return D.team.map((m, i) => {
      const idx = m.manual ? -1 : list.findIndex((p) => p.nip && p.nip === m.nip);
      const p = idx >= 0 ? list[idx] : null;
      return { ...m, ...(p ? { nama: p.nama, pangkat: p.pangkat, jabatan: p.jabatan } : {}), rank: idx >= 0 ? idx : 10000 + i };
    });
  }
  function ensureKoordinator() { if (D.team.length && !D.team.some((m) => m.koordinator)) D.team[0].koordinator = true; }
  function addMember(m) {
    if (m.nip && D.team.some((x) => x.nip === m.nip)) return;
    D.team.push({ nama: m.nama, nip: m.nip || "", pangkat: m.pangkat || "", jabatan: m.jabatan || "", manual: !!m.manual, koordinator: false });
    ensureKoordinator(); saveDraft(); renderTeam(); rebuild();
  }
  function renderTeam() {
    const T = teamWithRank().map((m, i) => ({ ...m, i })).sort((a, b) => a.rank - b.rank);
    $("rTeam").innerHTML = T.length ? `<p class="muted">${T.length} orang, urut kepangkatan. Pilih koordinator kegiatan.</p>` + T.map((m) => `<div class="mem">
      <label class="koord" title="Koordinator kegiatan"><input type="radio" name="rKoord" data-i="${m.i}" ${m.koordinator ? "checked" : ""}> Koordinator</label>
      <div class="who"><b>${esc(m.nama)}</b><small>${esc(m.nip ? R.fmtNip(m.nip) : "-")}${m.jabatan ? " · " + esc(m.jabatan) : ""}${m.manual ? " · manual" : ""}</small></div>
      <button type="button" class="btn link" data-del="${m.i}" aria-label="Hapus ${esc(m.nama)}">Hapus</button></div>`).join("")
      : `<p class="muted">Belum ada anggota. Ketik nama di kotak pencarian lalu klik untuk menambahkan.</p>`;
  }
  $("rTeam").addEventListener("change", (e) => {
    const r = e.target.closest("[name=rKoord]"); if (!r) return;
    D.team.forEach((m, i) => (m.koordinator = i === Number(r.dataset.i)));
    saveDraft(); rebuild();
  });
  $("rTeam").addEventListener("click", (e) => {
    const b = e.target.closest("[data-del]"); if (!b) return;
    D.team.splice(Number(b.dataset.del), 1);
    ensureKoordinator(); saveDraft(); renderTeam(); rebuild();
  });
  bindPicker($("rSearch"), $("rResults"), (p) => addMember(p), () => D.team.map((m) => m.nip));
  $("rManAdd").addEventListener("click", () => {
    const v = {}; document.querySelectorAll("#rManForm [data-m]").forEach((el) => (v[el.dataset.m] = el.value.trim()));
    if (!v.nama) { $("rManForm").querySelector("[data-m=nama]").focus(); return; }
    addMember({ ...v, manual: true });
    document.querySelectorAll("#rManForm [data-m]").forEach((el) => (el.value = ""));
  });

  /* ---------- Pejabat Pembuat Komitmen ---------- */
  function guessPpk() { return A.pegawaiList().find((p) => /pejabat pembuat komitmen|\bppk\b/i.test(p.jabatan)) || null; }
  function renderPpk() {
    const p = rs.ppk;
    $("rPpkInfo").innerHTML = p ? `PPK: <b>${esc(p.nama)}</b><br>NIP. ${esc(R.fmtNip(p.nip))} <button type="button" class="btn link" id="rPpkClear">Ganti</button>` : `Belum dipilih. Cari nama PPK di atas; pilihan disimpan untuk RPK berikutnya.`;
  }
  bindPicker($("rPpkSearch"), $("rPpkResults"), (p) => { rs.ppk = { nama: p.nama, nip: p.nip }; store.set("rpk:ppk", rs.ppk); renderPpk(); rebuild(); }, () => []);
  $("rPpkInfo").addEventListener("click", (e) => { if (e.target.id === "rPpkClear") { rs.ppk = null; store.set("rpk:ppk", null); renderPpk(); $("rPpkSearch").focus(); rebuild(); } });

  /* ---------- RAB ---------- */
  function renderRab() {
    $("rRab").innerHTML = `<table><thead><tr><th>MAK</th><th>Jenis belanja</th><th>Vol</th><th>Sat</th><th>Harga (Rp)</th><th></th></tr></thead><tbody>${rs.rab.map((r, i) => `<tr>
      <td><input data-r="${i}" data-k="mak" value="${esc(r.mak)}" inputmode="numeric"></td>
      <td><input data-r="${i}" data-k="jenis" value="${esc(r.jenis)}"></td>
      <td><input data-r="${i}" data-k="vol" value="${esc(r.vol)}" inputmode="numeric"></td>
      <td><input data-r="${i}" data-k="sat" value="${esc(r.sat)}"></td>
      <td><input data-r="${i}" data-k="harga" value="${esc(r.harga)}" inputmode="numeric"></td>
      <td><button type="button" class="btn link" data-rdel="${i}" aria-label="Hapus baris">×</button></td></tr>`).join("")}</tbody></table>
      <p class="fixed" id="rRabTotal"></p>`;
    rabTotal();
  }
  function rabTotal() {
    const tot = rs.rab.reduce((s, r) => s + K.numVal(r.vol) * K.numVal(r.harga), 0);
    $("rRabTotal").innerHTML = `Jumlah anggaran: <b>Rp.${K.rp(tot)},-</b><br><small>${esc(K.terbilangRupiah(tot))}</small>`;
  }
  let t2;
  $("rRab").addEventListener("input", (e) => {
    const el = e.target.closest("[data-r]"); if (!el) return;
    rs.rab[el.dataset.r][el.dataset.k] = el.value;
    store.set("rpk:rab", rs.rab); rabTotal();
    clearTimeout(t2); t2 = setTimeout(rebuild, 600);
  });
  $("rRab").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rdel]"); if (!b) return;
    rs.rab.splice(Number(b.dataset.rdel), 1); store.set("rpk:rab", rs.rab); renderRab(); rebuild();
  });
  $("rRabAdd").addEventListener("click", () => { const last = rs.rab[rs.rab.length - 1]; rs.rab.push({ mak: last ? last.mak : "", jenis: "", vol: "", sat: "", harga: "" }); store.set("rpk:rab", rs.rab); renderRab(); });
  $("rRabReset").addEventListener("click", () => { rs.rab = K.DEFAULT_RAB.map((r) => ({ ...r })); store.set("rpk:rab", rs.rab); renderRab(); rebuild(); });

  /* ---------- Scan Surat Tugas ---------- */
  let pdfjsP = null;
  function loadPdfjs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return pdfjsP || (pdfjsP = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"; res(window.pdfjsLib); };
      s.onerror = () => { pdfjsP = null; rej(new Error("Pustaka PDF tidak bisa dimuat (perlu internet).")); };
      document.head.appendChild(s);
    }));
  }
  async function pdfPages(file) {
    const lib = await loadPdfjs();
    const pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
    const out = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      $("rScanStatus").textContent = `Mengubah halaman PDF ${n} dari ${pdf.numPages}…`;
      const page = await pdf.getPage(n), v0 = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: Math.min(3, 1700 / v0.width) });
      const c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      out.push(c.toDataURL("image/jpeg", 0.85));
    }
    return out;
  }
  async function addScans(files) {
    const st = $("rScanStatus");
    try {
      for (const f of files) {
        st.textContent = "Membaca " + f.name + "…";
        if (/\.pdf$/i.test(f.name) || f.type === "application/pdf") rs.scans.push(...(await pdfPages(f)));
        else if (/^image\//.test(f.type) || /\.(jpe?g|png)$/i.test(f.name)) rs.scans.push(await A.shrink(f, 2000));
        else throw new Error(f.name + " bukan JPG, PNG, atau PDF.");
      }
      await idb.set("rpk:scans", rs.scans);
      st.textContent = `✓ ${rs.scans.length} halaman Surat Tugas.`;
    } catch (e) { console.error(e); st.textContent = "Gagal: " + e.message; }
    renderScans(); rebuild();
  }
  function renderScans() {
    $("rScans").innerHTML = rs.scans.map((u, i) => `<div class="scan-it"><img src="${u}" alt="Halaman ${i + 1}"><div><small>Hal. ${i + 1}</small>
      ${i ? `<button type="button" class="btn link" data-up="${i}" aria-label="Naikkan">↑</button>` : ""}<button type="button" class="btn link" data-sdel="${i}">Hapus</button></div></div>`).join("");
  }
  $("rScanInput").addEventListener("change", (e) => { const f = [...e.target.files]; e.target.value = ""; if (f.length) addScans(f); });
  $("rScans").addEventListener("click", async (e) => {
    const d = e.target.closest("[data-sdel]"), u = e.target.closest("[data-up]");
    if (d) rs.scans.splice(Number(d.dataset.sdel), 1);
    else if (u) { const i = Number(u.dataset.up); [rs.scans[i - 1], rs.scans[i]] = [rs.scans[i], rs.scans[i - 1]]; }
    else return;
    await idb.set("rpk:scans", rs.scans); $("rScanStatus").textContent = ""; renderScans(); rebuild();
  });

  /* ---------- Narasi ---------- */
  $("rpkReport").addEventListener("input", (e) => {
    const k = e.target.closest("[data-note]"); if (!k) return;
    const saved = store.get("rpk:notes", {}); saved[k.dataset.note] = k.innerText.replace(/\n$/, ""); store.set("rpk:notes", saved);
  });
  let armed = false;
  $("rResetNotes").addEventListener("click", (e) => {
    if (!armed) { armed = true; e.currentTarget.textContent = "Klik lagi untuk mengatur ulang"; setTimeout(() => { armed = false; $("rResetNotes").textContent = "Atur ulang narasi"; }, 4000); return; }
    armed = false; $("rResetNotes").textContent = "Atur ulang narasi"; store.set("rpk:notes", {}); rebuild();
  });
  let newArmed = false;
  $("rNew").addEventListener("click", async (e) => {
    if (!newArmed) { newArmed = true; e.currentTarget.textContent = "Klik lagi untuk mengosongkan"; setTimeout(() => { newArmed = false; $("rNew").textContent = "Mulai RPK baru"; }, 4000); return; }
    newArmed = false; $("rNew").textContent = "Mulai RPK baru";
    Object.assign(D, EMPTY()); saveDraft(); store.set("rpk:notes", {});
    rs.scans = []; await idb.set("rpk:scans", []);
    fillForm(); renderTeam(); renderScans(); $("rScanStatus").textContent = ""; rebuild();
  });

  /* ---------- Membangun RPK ---------- */
  let building = false, again = false;
  async function rebuild() {
    if (!rs.active) return;
    if (building) { again = true; return; }
    building = true;
    try {
      const P = A.profileView(), layers = A.state.layers;
      const I = K.build(D.info, P, teamWithRank(), rs.rab, layers, rs.ppk);
      I.scans = rs.scans;
      rs.I = I;
      rs.notes = { ...K.autoNotes(I), ...store.get("rpk:notes", {}) };
      const key = [P.basemap, layers.map((l) => l.name + l.role + l.field).join(), I.grids.join(), I.judul, I.nomorST, I.tanggalTtd, P.balai, P.logo.length].join("|");
      if (key !== rs.mapKey) {
        rs.map = null;
        if (I.gridFeatures.length) {
          busy("Menggambar peta rencana…");
          const sources = ["Grid rencana patroli, batas kawasan, zonasi, resor, dan jalur: Balai TN Tambora",
            P.basemap !== "none" ? "Peta dasar: " + (P.basemap === "osm" ? "OpenStreetMap" : "Esri") : ""].filter(Boolean).join("\n");
          rs.map = await SRGMap.render({
            layers, basemap: P.basemap, logo: P.logo, instansi: P.balai || "Balai Taman Nasional Tambora", tahun: I.year, sources,
            subtitle: `${I.judul}\n${I.nomorST || "Rencana Pelaksanaan Kegiatan"}`, title: "Rencana Smart Patrol Berbasis Grid",
            lines: [], points: [], highlight: I.gridFeatures, highlightLabel: "Grid rencana patroli", legend: [],
            stat: `Jumlah grid rencana: ${I.gridFeatures.length} (${I.gridFeatures.length * 100} ha)`
          });
          busy(P.basemap !== "none" && rs.map && !rs.map.tilesOk ? "Peta dasar tidak bisa dimuat (offline atau diblokir); peta dibuat tanpa latar." : "");
        }
        rs.mapKey = key;
      }
      $("rpkReport").innerHTML = K.render(I, P, rs.notes, rs.map);
      renderReady(K.readiness(I, D.info, P, rs.scans));
      $("rGridInfo").innerHTML = !I.grids.length ? "Peta lampiran dibuat dari grid ini." : I.gridInfo.map((g) => `Grid <b>${esc(g.grid)}</b>${g.zona ? " · " + esc(g.zona) : ""}${g.resort ? " · Resor " + esc(g.resort) : ""}`).join("<br>")
        + (I.notFound.length ? `<br><span class="warn">Tidak ada di lapisan grid: ${esc(I.notFound.join(", "))}</span>` : "");
      $("rDipaInfo").innerHTML = I.nomorDipa ? `Sumber anggaran: <b>${esc(I.sumberAnggaran)}</b><br>DIPA Nomor <b>${esc(I.nomorDipa)}</b> tanggal <b>${esc(R.tglPanjang(I.tanggalDipa))}</b>` : `DIPA TA.${esc(I.year)} belum tercatat di data/dipa.json.`;
    } catch (e) { console.error(e); busy("Gagal menyusun RPK: " + e.message); }
    building = false;
    if (again) { again = false; rebuild(); }
  }
  function renderReady(items) {
    const missing = items.filter((x) => !x.ok);
    $("rReady").hidden = false;
    $("rReady").innerHTML = `<div class="ready-head"><b>Kesiapan data RPK</b><span class="pill ${missing.length ? "warn" : "ok"}">${missing.length ? `${missing.length} belum lengkap` : "Siap dibuat final"}</span></div>
      <ul>${items.map((x) => `<li class="${x.ok ? "ok" : "no"}"><span class="mk">${x.ok ? "✓" : "!"}</span>${esc(x.label)}${x.note ? ` <small>${esc(x.note)}</small>` : ""}</li>`).join("")}</ul>`;
  }

  /* ---------- Ekspor ---------- */
  $("rPrintBtn").addEventListener("click", () => window.print());
  $("rDocxBtn").addEventListener("click", async (e) => {
    const btn = e.currentTarget; btn.disabled = true;
    try {
      const I = rs.I || {};
      await SRGExport.docx($("rpkReport"), null, busy, { title: `RPK ${I.judul || ""} ${I.nomorST || ""}`.trim(), fileName: `RPK_${SRGExport.safeName(I.nomorST || "tanpa_nomor")}.docx` });
      busy("");
    } catch (err) { console.error(err); busy("Gagal: " + err.message); } finally { btn.disabled = false; }
  });

  if (window.SRG_PREVIEW_ONLY) {
    ["rPrintBtn", "rDocxBtn"].forEach((id) => ($(id).hidden = true));
    const note = document.createElement("p"); note.className = "preview-note";
    note.textContent = "Ini versi pratinjau. Tombol cetak/PDF dan Word aktif di versi GitHub Pages.";
    $("rToolbar").prepend(note);
  }

  /* ---------- Mulai ---------- */
  (async () => {
    if (!rs.ppk) { const g = guessPpk(); if (g) rs.ppk = { nama: g.nama, nip: g.nip }; }
    fillForm(); renderTeam(); renderPpk(); renderRab();
    rs.scans = (await idb.get("rpk:scans")) || [];
    renderScans();
    await A.layersReady;
    if (store.get("tab", "lpk") === "rpk") showTab("rpk");
  })();
  window.SRG_RPK = rs; // untuk debugging di konsol
})();
