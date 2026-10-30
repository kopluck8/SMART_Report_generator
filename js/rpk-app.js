/*
 * Tab RPK: form rencana, tim dari daftar pegawai (bisa dicari) dan anggota per unsur, PPK, RAB, alat dan bahan,
 * peta grid rencana, scan Surat Tugas, dan ekspor.
 * Data RPK terpisah dari LPK; yang dipakai bersama hanya Profil Balai (termasuk dasar dan metode), daftar pegawai, dan lapisan peta.
 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const A = window.SRG_APP, R = window.SRGReport, K = window.SRGRpk, U = window.SRGUI;
  const { store, idb } = A, esc = R.esc;

  const EMPTY = () => ({ info: {}, team: [] });
  const rs = {
    draft: { ...EMPTY(), ...store.get("rpk:draft", {}) },
    rab: store.get("rpk:rab", null) || R.DEFAULT_RAB.map((r) => ({ ...r })),
    alat: store.get("rpk:alat", null) || R.DEFAULT_ALAT.map((r) => ({ ...r })),
    ppk: store.get("rpk:ppk", null),
    notes: {}, map: null, mapKey: "", I: null, active: false
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
    if (rs.active) { $("rDasar").value = A.state.profile.dasarHukum || R.DEFAULT_DASAR; rebuild(); }
  }
  document.querySelector(".tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) showTab(b.dataset.tab); });

  /* ---------- Form rencana ---------- */
  function fillForm() {
    for (const el of document.querySelectorAll("[data-rpk]")) {
      const v = D.info[el.dataset.rpk];
      if (el.type === "checkbox") el.checked = !!v; else el.value = v ?? "";
    }
    document.querySelector('[data-rpk="tempatTtd"]').placeholder = A.state.profile.kota || "Dompu";
    $("rDasar").value = A.state.profile.dasarHukum || R.DEFAULT_DASAR;
  }
  let t1;
  document.querySelectorAll("[data-rpk]").forEach((el) => el.addEventListener("input", () => {
    D.info[el.dataset.rpk] = el.type === "checkbox" ? el.checked : el.value;
    saveDraft();
    clearTimeout(t1); t1 = setTimeout(rebuild, 500);
  }));
  // Dasar disimpan di Profil Balai dan dipakai bersama LPK
  const setDasar = (v) => { A.state.profile.dasarHukum = v; store.set("profile", A.state.profile); const p = $("p_dasarHukum"); if (p) p.value = v; };
  $("rDasar").addEventListener("input", () => { setDasar($("rDasar").value); clearTimeout(t1); t1 = setTimeout(rebuild, 600); });
  $("rDasarReset").addEventListener("click", () => { setDasar(R.DEFAULT_DASAR); $("rDasar").value = R.DEFAULT_DASAR; rebuild(); });

  /* ---------- Tim pelaksana ---------- */
  // Urutan tim: per unsur (Balai, Polri, TNI, masyarakat), lalu urutan baris daftar pegawai (kepangkatan)
  function teamWithRank() {
    const list = A.pegawaiList();
    return D.team.map((m, i) => {
      const idx = m.manual ? -1 : list.findIndex((p) => p.nip && p.nip === m.nip);
      const p = idx >= 0 ? list[idx] : null;
      return { ...m, ...(p ? { nama: p.nama, pangkat: p.pangkat, jabatan: p.jabatan } : {}), unsur: p ? "balai" : m.unsur || R.guessUnsur(m) || "masyarakat", rank: idx >= 0 ? idx : 10000 + i, i };
    });
  }
  function ensureKoordinator() { if (D.team.length && !D.team.some((m) => m.koordinator)) D.team[0].koordinator = true; }
  function addMember(m) {
    if (m.nip && D.team.some((x) => x.nip === m.nip)) return;
    D.team.push({ nama: m.nama, nip: m.nip || "", pangkat: m.pangkat || "", jabatan: m.jabatan || "", unsur: m.unsur || "", manual: !!m.manual, koordinator: false });
    ensureKoordinator(); saveDraft(); renderTeam(); rebuild();
  }
  function renderTeam() {
    const T = teamWithRank().sort((a, b) => R.unsurGroup(a.unsur) - R.unsurGroup(b.unsur) || a.rank - b.rank);
    $("rTeam").innerHTML = T.length ? `<p class="muted">${esc(R.teamSentence(T.map((m) => ({ ...m, name: m.nama }))))} Pilih koordinator kegiatan.</p>` + T.map((m) => `<div class="mem">
      <label class="koord" title="Koordinator kegiatan"><input type="radio" name="rKoord" data-i="${m.i}" ${m.koordinator ? "checked" : ""}> Koordinator</label>
      <div class="who"><b>${esc(m.nama)}</b><small>${esc(m.nip ? R.fmtNip(m.nip) : "-")}${m.jabatan ? " · " + esc(m.jabatan) : ""}</small>
      ${m.manual ? U.unsurSelect(m.unsur, `data-unsur="${m.i}" aria-label="Unsur ${esc(m.nama)}"`) : `<small>${esc(R.UNSUR.balai)}</small>`}</div>
      <button type="button" class="btn link" data-del="${m.i}" aria-label="Hapus ${esc(m.nama)}">Hapus</button></div>`).join("")
      : `<p class="muted">Belum ada anggota. Ketik nama di kotak pencarian lalu klik untuk menambahkan.</p>`;
  }
  $("rTeam").addEventListener("change", (e) => {
    const r = e.target.closest("[name=rKoord]"), u = e.target.closest("[data-unsur]");
    if (r) D.team.forEach((m, i) => (m.koordinator = i === Number(r.dataset.i)));
    else if (u) { D.team[Number(u.dataset.unsur)].unsur = u.value; renderTeam(); }
    else return;
    saveDraft(); rebuild();
  });
  $("rTeam").addEventListener("click", (e) => {
    const b = e.target.closest("[data-del]"); if (!b) return;
    D.team.splice(Number(b.dataset.del), 1);
    ensureKoordinator(); saveDraft(); renderTeam(); rebuild();
  });
  U.bindPicker($("rSearch"), $("rResults"), () => A.pegawaiList(), (p) => addMember(p), () => D.team.map((m) => m.nip));
  $("rManUnsur").innerHTML = U.unsurSelect("", "").replace(/^<select >|<\/select>$/g, "");
  $("rManAdd").addEventListener("click", () => {
    const v = {}; document.querySelectorAll("#rManForm [data-m]").forEach((el) => (v[el.dataset.m] = el.value.trim()));
    if (!v.nama) { $("rManForm").querySelector("[data-m=nama]").focus(); return; }
    addMember({ ...v, unsur: v.unsur || R.guessUnsur(v) || "masyarakat", manual: true });
    document.querySelectorAll("#rManForm [data-m]").forEach((el) => (el.value = ""));
  });

  /* ---------- Pejabat Pembuat Komitmen ---------- */
  function guessPpk() { return A.pegawaiList().find((p) => /pejabat pembuat komitmen|\bppk\b/i.test(p.jabatan)) || null; }
  function renderPpk() {
    const p = rs.ppk;
    $("rPpkInfo").innerHTML = p ? `PPK: <b>${esc(p.nama)}</b><br>NIP. ${esc(R.fmtNip(p.nip))} <button type="button" class="btn link" id="rPpkClear">Ganti</button>` : `Belum dipilih. Cari nama PPK di atas; pilihan disimpan untuk RPK berikutnya.`;
  }
  U.bindPicker($("rPpkSearch"), $("rPpkResults"), () => A.pegawaiList(), (p) => { rs.ppk = { nama: p.nama, nip: p.nip }; store.set("rpk:ppk", rs.ppk); renderPpk(); rebuild(); }, () => []);
  $("rPpkInfo").addEventListener("click", (e) => { if (e.target.id === "rPpkClear") { rs.ppk = null; store.set("rpk:ppk", null); renderPpk(); $("rPpkSearch").focus(); rebuild(); } });

  /* ---------- RAB dan alat ---------- */
  let t2;
  const later = () => { clearTimeout(t2); t2 = setTimeout(rebuild, 600); };
  const rabEd = U.rowsEditor($("rRab"), U.RAB_COLS, () => rs.rab, () => { store.set("rpk:rab", rs.rab); later(); }, U.rabFooter);
  const alatEd = U.rowsEditor($("rAlat"), U.ALAT_COLS, () => rs.alat, () => { store.set("rpk:alat", rs.alat); later(); });
  $("rRabAdd").addEventListener("click", () => { const last = rs.rab[rs.rab.length - 1]; rabEd.add({ mak: last ? last.mak : "", jenis: "", vol: "", sat: "", harga: "" }); });
  $("rRabReset").addEventListener("click", () => { rs.rab = R.DEFAULT_RAB.map((r) => ({ ...r })); store.set("rpk:rab", rs.rab); rabEd.render(); rebuild(); });
  $("rAlatAdd").addEventListener("click", () => alatEd.add({ nama: "", jumlah: "", sat: "unit" }));

  /* ---------- Scan Surat Tugas ---------- */
  const scans = U.scanBox({ input: $("rScanInput"), list: $("rScans"), status: $("rScanStatus"), idb, shrink: A.shrink, getKey: () => "rpk:scans", onChange: () => rebuild() });

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
    await scans.clear();
    fillForm(); renderTeam(); rebuild();
  });

  /* ---------- Membangun RPK ---------- */
  let building = false, again = false;
  async function rebuild() {
    if (!rs.active) return;
    if (building) { again = true; return; }
    building = true;
    try {
      const P = A.profileView(), layers = A.state.layers;
      const I = K.build(D.info, P, teamWithRank(), rs.rab, layers, rs.ppk, rs.alat);
      I.scans = scans.get();
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
      renderReady(K.readiness(I, D.info, P, I.scans, rs.notes));
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
    // Draft lama: unsur anggota manual ditebak dari jabatan/pangkat
    D.team.forEach((m) => { if (m.manual && !m.unsur) m.unsur = R.guessUnsur(m) || "masyarakat"; });
    fillForm(); renderTeam(); renderPpk(); rabEd.render(); alatEd.render();
    await scans.load();
    await A.layersReady;
    if (store.get("tab", "lpk") === "rpk") showTab("rpk");
  })();
  window.SRG_RPK = rs; // untuk debugging di konsol
})();
