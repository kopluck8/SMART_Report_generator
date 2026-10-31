/*
 * Komponen form yang dipakai bersama tab LPK dan RPK: tabel isian (RAB, alat), pencarian pegawai,
 * pilihan unsur anggota, dan unggah scan Surat Tugas (JPG/PNG/PDF).
 */
(function () {
  "use strict";
  const R = window.SRGReport, esc = R.esc;

  /* ---------- Tabel isian baris ---------- */
  // cols: [{k, label, w, num, type: "date"|"number"|"select", opts, list}]; rows diubah langsung; onChange dipanggil setiap ketikan
  const cellHtml = (c, r, i) => {
    const v = r[c.k] ?? "", a = `data-r="${i}" data-k="${c.k}" aria-label="${esc(c.label)}"`;
    if (c.type === "select") return `<select ${a}><option value=""></option>${c.opts.map((o) => `<option${o === v ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    return `<input ${a} value="${esc(v)}"${c.type === "date" ? ' type="date"' : c.type === "number" ? ' type="number" min="0"' : ""}${c.num ? ' inputmode="numeric"' : ""}${c.list ? ` list="${c.list}"` : ""}>`;
  };
  function rowsEditor(el, cols, getRows, onChange, footer) {
    const render = () => {
      const rows = getRows();
      el.innerHTML = `<table><thead><tr>${cols.map((c) => `<th>${esc(c.label)}</th>`).join("")}<th></th></tr></thead><tbody>${rows.map((r, i) => `<tr>${cols.map((c) => `<td${c.w ? ` style="width:${c.w}"` : ""}>${cellHtml(c, r, i)}</td>`).join("")}<td style="width:22px"><button type="button" class="btn link" data-rdel="${i}" aria-label="Hapus baris">×</button></td></tr>`).join("")}</tbody></table>${footer ? `<p class="fixed" data-foot></p>` : ""}`;
      foot();
    };
    const foot = () => { const f = el.querySelector("[data-foot]"); if (f && footer) f.innerHTML = footer(getRows()); };
    el.addEventListener("input", (e) => {
      const inp = e.target.closest("[data-r]"); if (!inp) return;
      getRows()[inp.dataset.r][inp.dataset.k] = inp.value;
      foot(); onChange(false);
    });
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-rdel]"); if (!b) return;
      getRows().splice(Number(b.dataset.rdel), 1); render(); onChange(true);
    });
    return { render, add(row) { getRows().push(row); render(); onChange(true); el.querySelector("tbody tr:last-child input")?.focus(); } };
  }
  const RAB_COLS = [{ k: "mak", label: "MAK", w: "62px", num: true }, { k: "jenis", label: "Jenis belanja" }, { k: "vol", label: "Vol", w: "40px", num: true }, { k: "sat", label: "Sat", w: "50px" }, { k: "harga", label: "Harga (Rp)", w: "78px", num: true }];
  const ALAT_COLS = [{ k: "nama", label: "Jenis alat/bahan" }, { k: "jumlah", label: "Jumlah", w: "54px", num: true }, { k: "sat", label: "Satuan", w: "60px" }];
  const rabFooter = (rows) => { const tot = R.rabRows(rows).reduce((s, r) => s + r.total, 0); return `Jumlah anggaran: <b>${R.rupiah(tot) || "Rp0,00"}</b><br><small>${esc(R.terbilangRupiah(tot))}</small>`; };

  /* ---------- Judul baku kegiatan ---------- */
  // Memilih judul baku mengisi kolom judul (tetap bisa diedit); onPick menerima entri KEGIATAN
  function bindJudul(select, input, onPick) {
    select.innerHTML = `<option value="">Pilih judul baku… (atau ketik sendiri di bawah)</option>` + R.KEGIATAN.map((k, i) => `<option value="${k.id}">${i + 1}. ${esc(k.judul)}</option>`).join("");
    const sync = () => { const k = R.KEGIATAN.find((x) => x.judul === input.value.trim()); select.value = k ? k.id : ""; };
    select.addEventListener("change", () => {
      const k = R.KEGIATAN.find((x) => x.id === select.value); if (!k) return;
      input.value = k.judul; input.dispatchEvent(new Event("input", { bubbles: true })); onPick(k);
    });
    input.addEventListener("input", sync);
    return { sync };
  }
  // Alat bawaan judul hanya dipasang bila jumlah alat belum pernah diisi
  const alatUntouched = (rows) => !rows.some((r) => String(r.jumlah || "").trim());

  /* ---------- Unsur anggota ---------- */
  const unsurSelect = (val, attrs) => `<select ${attrs}><option value="">Pilih unsur…</option>${Object.entries(R.UNSUR).map(([k, v]) => `<option value="${k}" ${k === val ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>`;

  /* ---------- Pencarian pegawai ---------- */
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
  // Singkatan jabatan yang biasa dipakai saat mencari: polhut, PEH, kasubbag, SPTN
  const ALIAS = [[/polisi kehutanan/, "polhut"], [/pengendali ekosistem hutan/, "peh"], [/penyuluh kehutanan/, "penyuluh"], [/sub ?bagian tata usaha/, "kasubbag ksbtu tu"], [/seksi pengelolaan taman nasional/, "sptn kspt"], [/kepala balai/, "kabalai"]];
  const alias = (h) => h + ALIAS.filter(([re]) => re.test(h)).map(([, a]) => " " + a).join("");
  function search(list, q, exclude = []) {
    const words = norm(q).split(" ").filter(Boolean);
    if (!words.length) return [];
    return list.map((p, i) => ({ ...p, rank: i })).filter((p) => !exclude.includes(p.nip) && words.every((w) => alias(norm(`${p.nama} ${p.nip} ${p.jabatan}`)).includes(w))).slice(0, 10);
  }
  const pickItem = (p) => `<button type="button" class="pick" data-nip="${esc(p.nip)}"><b>${esc(p.nama)}</b><small>${esc(R.fmtNip(p.nip) || "-")} · ${esc(p.jabatan || "-")}</small></button>`;
  // onManual(teks): bila nama tidak ada di daftar pegawai, tawarkan isian manual dengan nama yang sudah diketik
  function bindPicker(input, box, getList, onPick, exclude, onManual) {
    const show = () => {
      const q = input.value.trim(), res = search(getList(), input.value, exclude());
      box.innerHTML = q ? (res.map(pickItem).join("") || `<p class="muted">Tidak ada di daftar pegawai.</p>`) + (onManual ? `<button type="button" class="pick manual-pick" data-manual><b>Isi manual: ${esc(q)}</b><small>Untuk petugas di luar daftar pegawai (Polri, TNI, MMP, MPA, masyarakat, atau pegawai baru)</small></button>` : "") : "";
    };
    input.addEventListener("input", show);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); const b = box.querySelector(".pick"); if (b) b.click(); }
      if (e.key === "Escape") { input.value = ""; show(); }
    });
    box.addEventListener("click", (e) => {
      const b = e.target.closest(".pick"); if (!b) return;
      if (b.hasAttribute("data-manual")) { const q = input.value.trim(); input.value = ""; show(); onManual(q); return; }
      const p = getList().find((x) => x.nip === b.dataset.nip); if (!p) return;
      onPick(p); input.value = ""; show(); input.focus();
    });
  }

  /* ---------- Peran dalam tim ---------- */
  const peranSelect = (val, attrs) => `<select ${attrs}>${R.PERAN.map((p) => `<option${p.k === val ? " selected" : ""}>${esc(p.k)}</option>`).join("")}</select>`;

  /* ---------- Isian lapangan (pilihan baku, tanpa mengetik narasi) ---------- */
  // fields dari SRGReport.faktaShown; nilai disimpan di objek getFacts(); onChange(segera) dipanggil setiap perubahan
  function factsForm(el, getFacts, onChange) {
    let sig = "";
    const NONE = /^tidak ada\b/i;
    el.addEventListener("input", (e) => {
      const t = e.target.closest("[data-fact]"); if (!t) return;
      const f = getFacts(), k = t.dataset.fact;
      if (t.type === "checkbox") {
        const boxes = [...el.querySelectorAll(`[data-fact="${k}"]`)];
        // "tidak ada …" tidak digabung dengan pilihan lain
        if (t.checked) boxes.forEach((b) => { if (b !== t && NONE.test(b.value) !== NONE.test(t.value)) b.checked = false; });
        f[k] = boxes.filter((b) => b.checked).map((b) => b.value);
      } else f[k] = t.value;
      onChange(t.type === "checkbox" || t.tagName === "SELECT");
    });
    el.addEventListener("click", (e) => {
      if (!e.target.closest("[data-kadd]")) return;
      const f = getFacts(); (f.kamera || (f.kamera = [])).push({ kode: "", pasang: "", unduh: "", foto: "", satwa: "", kondisi: "" });
      sig = ""; render(last.fields, last.ctx, true); onChange(true);
    });
    let last = { fields: [], ctx: {} };
    function render(fields, ctx, force) {
      last = { fields, ctx };
      const s = JSON.stringify(fields.map((x) => [x.k, R.faktaOpts(x, ctx), !!(x.req && x.req(ctx))]));
      if (s === sig && !force) return;
      sig = s;
      const f = getFacts();
      const lbl = (x) => `${esc(x.label)}${x.req && x.req(ctx) ? ' <b class="warn">wajib</b>' : ""}`;
      el.innerHTML = fields.length ? fields.map((x) => {
        const v = f[x.k], opts = R.faktaOpts(x, ctx);
        if (x.type === "pilih") return `<label class="fld">${lbl(x)}<select data-fact="${x.k}"><option value="">(tidak ditulis di laporan)</option>${opts.map((o) => `<option${o === v ? " selected" : ""}>${esc(o)}</option>`).join("")}</select></label>`;
        if (x.type === "multi") return `<fieldset class="fld ckset"><legend>${lbl(x)}</legend>${opts.map((o) => `<label class="ck"><input type="checkbox" data-fact="${x.k}" value="${esc(o)}"${(v || []).includes(o) ? " checked" : ""}> <span>${esc(o)}</span></label>`).join("")}</fieldset>`;
        if (x.type === "angka") return `<label class="fld">${lbl(x)}<input type="number" min="0" step="any" data-fact="${x.k}" value="${esc(v ?? "")}"></label>`;
        if (x.type === "tanggal") return `<label class="fld">${lbl(x)}<input type="date" data-fact="${x.k}" value="${esc(v ?? "")}"></label>`;
        if (x.type === "kamera") return `<div class="fld">${lbl(x)}<div class="rab-ed" data-kamera></div><div class="btnrow"><button type="button" class="btn small ghost" data-kadd>Tambah kamera</button></div></div>`;
        return "";
      }).join("") : `<p class="muted">Tidak ada isian tambahan untuk kegiatan ini.</p>`;
      const kd = el.querySelector("[data-kamera]");
      if (kd) {
        if (!(f.kamera || []).length) f.kamera = [{ kode: "", pasang: "", unduh: "", foto: "", satwa: "", kondisi: "" }];
        rowsEditor(kd, R.KAMERA_COLS, () => getFacts().kamera, onChange).render();
      }
    }
    return { render, reset() { sig = ""; } };
  }

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
  async function pdfPages(file, status) {
    const lib = await loadPdfjs();
    const pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
    const out = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      status(`Mengubah halaman PDF ${n} dari ${pdf.numPages}…`);
      const page = await pdf.getPage(n), v0 = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: Math.min(3, 1700 / v0.width) });
      const c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      out.push(c.toDataURL("image/jpeg", 0.85));
    }
    return out;
  }
  // Kotak unggah scan; halaman disimpan di IndexedDB dengan key yang bisa berganti (per patroli)
  function scanBox({ input, list, status, idb, shrink, getKey, onChange }) {
    let scans = [];
    const setStatus = (m) => { status.textContent = m || ""; };
    const save = async () => { await idb.set(getKey(), scans); };
    const render = () => {
      list.innerHTML = scans.map((u, i) => `<div class="scan-it"><img src="${u}" alt="Halaman ${i + 1}"><div><small>Hal. ${i + 1}</small>
        ${i ? `<button type="button" class="btn link" data-up="${i}" aria-label="Naikkan">↑</button>` : ""}<button type="button" class="btn link" data-sdel="${i}">Hapus</button></div></div>`).join("");
    };
    input.addEventListener("change", async (e) => {
      const files = [...e.target.files]; e.target.value = "";
      if (!files.length) return;
      try {
        for (const f of files) {
          setStatus("Membaca " + f.name + "…");
          if (/\.pdf$/i.test(f.name) || f.type === "application/pdf") scans.push(...(await pdfPages(f, setStatus)));
          else if (/^image\//.test(f.type) || /\.(jpe?g|png)$/i.test(f.name)) scans.push(await shrink(f, 2000));
          else throw new Error(f.name + " bukan JPG, PNG, atau PDF.");
        }
        await save();
        setStatus(`✓ ${scans.length} halaman Surat Tugas.`);
      } catch (err) { console.error(err); setStatus("Gagal: " + err.message); }
      render(); onChange();
    });
    list.addEventListener("click", async (e) => {
      const d = e.target.closest("[data-sdel]"), u = e.target.closest("[data-up]");
      if (d) scans.splice(Number(d.dataset.sdel), 1);
      else if (u) { const i = Number(u.dataset.up); [scans[i - 1], scans[i]] = [scans[i], scans[i - 1]]; }
      else return;
      await save(); setStatus(""); render(); onChange();
    });
    return {
      get: () => scans,
      async load() { scans = (await idb.get(getKey())) || []; setStatus(""); render(); },
      async clear() { scans = []; await save(); setStatus(""); render(); }
    };
  }

  window.SRGUI = { bindJudul, alatUntouched, rowsEditor, RAB_COLS, ALAT_COLS, rabFooter, unsurSelect, peranSelect, factsForm, search, bindPicker, scanBox };
})();
