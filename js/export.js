/*
 * Ekspor: Word (.docx), isi template Word, CSV, KML, GeoJSON.
 * .docx dibuat dari laporan yang tampil (termasuk teks yang sudah diedit).
 */
(function () {
  "use strict";

  const download = (blob, name) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  };
  const safeName = (s) => String(s || "patroli").replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_");
  const xmlEsc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- CSV ---------- */
  function csv(M) {
    const keys = [];
    M.observations.forEach((o) => o.attrs.forEach((a) => { if (!keys.find((k) => k.key === a.key)) keys.push({ key: a.key, label: a.label }); }));
    const head = ["No", "Hari", "Tanggal", "Jam", "WP", "Lintang", "Bujur", "UTM", "Kategori", "Sub-kategori", ...keys.map((k) => k.label), "Foto"];
    const rows = M.observations.map((o) => {
      const u = SMART.toUTM(o.wp.x, o.wp.y);
      return [o.no, o.day.no, o.wp.date, o.wp.time, o.wp.id, o.wp.y.toFixed(6), o.wp.x.toFixed(6), `${u.zone} ${Math.round(u.x)} ${Math.round(u.y)}`,
        o.topLabel, o.catLabel, ...keys.map((k) => (o.attrs.find((a) => a.key === k.key) || {}).text || ""), o.photos.map((p) => p.file).join(" ")];
    });
    const cell = (v) => { const s = String(v ?? ""); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const text = "﻿" + [head, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
    download(new Blob([text], { type: "text/csv;charset=utf-8" }), `temuan_${safeName(M.patrol.id)}.csv`);
  }

  /* ---------- GeoJSON ---------- */
  function geojson(M) {
    const features = M.dayLines.map((l) => ({ type: "Feature", properties: { jenis: "track", hari: l.day, tanggal: M.days[l.day - 1].date }, geometry: { type: "LineString", coordinates: l.coords.map((c) => [c[0], c[1]]) } }));
    M.observations.forEach((o) => {
      const props = { jenis: "temuan", no: o.no, wp: o.wp.id, tanggal: o.wp.date, jam: o.wp.time, kategori: o.topLabel, sub_kategori: o.catLabel, foto: o.photos.map((p) => p.file).join(" ") };
      o.attrs.forEach((a) => (props[a.label] = a.text));
      features.push({ type: "Feature", properties: props, geometry: { type: "Point", coordinates: [o.wp.x, o.wp.y] } });
    });
    download(new Blob([JSON.stringify({ type: "FeatureCollection", features }, null, 1)], { type: "application/geo+json" }), `patroli_${safeName(M.patrol.id)}.geojson`);
  }

  /* ---------- KML ---------- */
  function kml(M) {
    const kc = (hex, a = "ff") => a + hex.slice(5, 7) + hex.slice(3, 5) + hex.slice(1, 3);
    const styles = M.days.map((d) => `<Style id="day${d.no}"><LineStyle><color>${kc(d.color)}</color><width>3</width></LineStyle></Style>`).join("")
      + Object.entries(M.color).map(([t, c]) => `<Style id="cat_${xmlEsc(t || "lain")}"><IconStyle><color>${kc(c)}</color><Icon><href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon></IconStyle></Style>`).join("");
    const tracks = M.dayLines.map((l) => `<Placemark><name>Hari ${l.day} (${M.days[l.day - 1].date})</name><styleUrl>#day${l.day}</styleUrl><LineString><tessellate>1</tessellate><coordinates>${l.coords.map((c) => `${c[0]},${c[1]}`).join(" ")}</coordinates></LineString></Placemark>`).join("");
    const pts = M.observations.map((o) => `<Placemark><name>${xmlEsc(o.species || o.catLabel)}</name><styleUrl>#cat_${xmlEsc(o.top || "lain")}</styleUrl><description><![CDATA[<b>${o.catLabel}</b><br>WP ${o.wp.id} · ${o.wp.date} ${o.wp.time}<br>${o.attrs.map((a) => `${a.label}: ${a.text}`).join("<br>")}]]></description><Point><coordinates>${o.wp.x},${o.wp.y}</coordinates></Point></Placemark>`).join("");
    const doc = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xmlEsc(M.patrol.id)}</name>${styles}<Folder><name>Track</name>${tracks}</Folder><Folder><name>Temuan</name>${pts}</Folder></Document></kml>`;
    download(new Blob([doc], { type: "application/vnd.google-earth.kml+xml" }), `patroli_${safeName(M.patrol.id)}.kml`);
  }

  /* ---------- Word (.docx) sesuai Memorandum M.57: huruf Arial 12 pt, tabel 11 pt ---------- */
  // A4, margin kiri 4 cm, lainnya 3 cm: lebar isi 14 cm ≈ 529 px pada 96 dpi
  const PAGE_W_PX = 525;
  const FONT = "Arial";
  const SZ = 24, SZ_T = 22; // ukuran dalam setengah poin: isi 12 pt, tabel dan keterangan 11 pt
  const TW_P = 7937, TW_L = 13436; // lebar bidang isi halaman tegak dan mendatar (DXA)
  const IND = 360; // satu tingkat inden (0,63 cm) seperti contoh Memorandum
  const FIRST = 567; // inden baris pertama paragraf (1 cm)

  // aspect: rasio lebar/tinggi untuk crop tengah (foto 4:3 agar seragam)
  async function imageData(src, maxPx, aspect) {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
    if (aspect) {
      if (sw / sh > aspect) { const w = sh * aspect; sx = (sw - w) / 2; sw = w; }
      else { const h = sw / aspect; sy = (sh - h) / 2; sh = h; }
    }
    const s = Math.min(1, maxPx / Math.max(sw, sh));
    const c = document.createElement("canvas");
    c.width = Math.round(sw * s); c.height = Math.round(sh * s);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.82));
    return { data: await blob.arrayBuffer(), w: c.width, h: c.height };
  }

  function makeBuilder() {
    const D = window.docx;
    if (!D) throw new Error("Pustaka docx belum termuat (perlu koneksi internet sekali).");
    const A = D.AlignmentType;
    const none = { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" };
    const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
    const thin = { style: D.BorderStyle.SINGLE, size: 4, color: "000000" };
    const borders = { top: thin, bottom: thin, left: thin, right: thin, insideHorizontal: thin, insideVertical: thin };
    const BODY = { line: 360, after: 0 };
    // tw: lebar bidang isi bagian yang sedang disusun; lamp: sudah masuk lampiran; noPB: abaikan ganti halaman pada elemen pertama bagian
    const st = { tw: TW_P, lamp: false, noPB: false };

    // Teks inline -> TextRun (menangani <b>, <i>, <br>, <small>)
    function runs(node, fmt = {}, out = []) {
      for (const c of node.childNodes) {
        if (c.nodeType === 3) { const t = c.textContent.replace(/\s+/g, " "); if (t.trim() || (t === " " && out.length)) out.push(new D.TextRun({ text: t, ...fmt })); }
        else if (c.nodeType === 1) {
          const tag = c.tagName;
          if (tag === "BR") out.push(new D.TextRun({ text: " ", break: 1, ...fmt }));
          else if (tag === "B" || tag === "STRONG") runs(c, { ...fmt, bold: true }, out);
          else if (tag === "SMALL") runs(c, { ...fmt, size: (fmt.size || SZ) - 2 }, out);
          else if (tag === "I" || tag === "EM") runs(c, { ...fmt, italics: true }, out);
          else if (tag === "MARK") runs(c, { ...fmt, highlight: "yellow" }, out);
          else runs(c, fmt, out);
        }
      }
      if (!out.length) out.push(new D.TextRun({ text: " ", ...fmt }));
      return out;
    }
    const para = (el, opts = {}, fmt = {}) => new D.Paragraph({ children: runs(el, fmt), ...opts });
    const textPara = (text, opts = {}, fmt = {}) => new D.Paragraph({ children: [new D.TextRun({ text: text || " ", ...fmt })], ...opts });
    // Tingkat inden dari kelas lv1/lv2/lv3: 1 = di bawah judul bagian, 2 = di bawah sub-bagian (a, b, …), 3 = di bawah butir 1), 2), …
    const lvOf = (el) => { const m = String(el.className || "").match(/\blv(\d)\b/); return m ? Number(m[1]) : 2; };
    // Butir bernomor/berhuruf: label pada inden dasar, teks satu tingkat lebih dalam (inden gantung)
    const itemPara = (left, label, kids) => new D.Paragraph({ alignment: A.JUSTIFIED, spacing: BODY, indent: { left: left + IND, hanging: IND }, tabStops: [{ type: D.TabStopType.LEFT, position: left + IND }], children: [new D.TextRun({ text: `${label}\t` }), ...kids] });
    const bodyPara = (left, kids) => new D.Paragraph({ alignment: A.JUSTIFIED, spacing: BODY, indent: { left, firstLine: FIRST }, children: kids });

    // Narasi: per baris (dipisah <br>) dengan format inline (nama ilmiah miring) tetap terbawa
    function noteLines(el) {
      const out = [];
      let cur = document.createElement("span");
      const flush = () => { out.push(cur); cur = document.createElement("span"); };
      const walk = (n) => {
        for (const c of n.childNodes) {
          if (c.nodeType === 1 && c.tagName === "BR") flush();
          else if (c.nodeType === 1 && (c.tagName === "DIV" || c.tagName === "P")) { flush(); walk(c); flush(); }
          else cur.appendChild(c.cloneNode(true));
        }
      };
      walk(el); flush();
      return out.filter((x) => x.textContent.trim());
    }
    // "1. …" menjadi butir bernomor, "a. …" butir berhuruf di bawahnya, baris lain paragraf biasa
    function bodyLineEl(span, lv) {
      const base = lv * IND;
      const text = span.textContent.replace(/^\s+/, "");
      const m = text.match(/^(\d+[.)])\s+/), a = text.match(/^([a-z][.)])\s+/), pre = m || a;
      if (pre) {
        // buang awalan nomor dari teks pertama; nomor ditulis ulang dengan tab
        let cut = span.textContent.length - text.length + pre[0].length;
        const tw = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
        for (let n = tw.nextNode(); n && cut > 0; n = tw.nextNode()) { const k = Math.min(cut, n.textContent.length); n.textContent = n.textContent.slice(k); cut -= k; }
      }
      const kids = runs(span);
      if (a) return itemPara(base + IND, a[1], kids);
      if (m) return itemPara(base, m[1], kids);
      return bodyPara(base, kids);
    }

    // Judul bagian: nomor/huruf menggantung, teks sejajar seperti contoh Memorandum
    const NUM = /^((?:\d+|[a-z])[.)])\s+(.*)$/;
    function heading(el, level, outline, left, bold, extra = {}) {
      const t = el.textContent.replace(/\s+/g, " ").trim(), m = t.match(NUM);
      const pb = el.classList.contains("pb") && !st.noPB;
      st.noPB = false;
      return new D.Paragraph({
        heading: level, outlineLevel: outline, keepNext: true, keepLines: true, pageBreakBefore: pb,
        spacing: { before: 240, after: 120, line: 360 },
        indent: m ? { left: left + IND, hanging: IND } : { left },
        tabStops: m ? [{ type: D.TabStopType.LEFT, position: left + IND }] : undefined,
        children: m ? [new D.TextRun({ text: `${m[1]}\t`, bold }), new D.TextRun({ text: m[2], bold })] : runs(el, { bold }),
        ...extra
      });
    }

    async function imagePara(src, widthPx, opts = {}) {
      const im = await imageData(src, opts.maxPx || 1600, opts.aspect);
      let w = widthPx, h = Math.round((widthPx * im.h) / im.w);
      if (opts.maxH && h > opts.maxH) { w = Math.round((w * opts.maxH) / h); h = opts.maxH; }
      return new D.Paragraph({ alignment: A.CENTER, children: [new D.ImageRun({ data: im.data, transformation: { width: w, height: h } })] });
    }

    // Lebar teks sebenarnya pada huruf Arial diukur dengan canvas (1 px = 15 DXA pada 96 dpi), ditambah 6% cadangan
    const ctx2d = document.createElement("canvas").getContext("2d");
    const textW = (t, size, bold) => { ctx2d.font = `${bold ? "bold " : ""}${size / 2}pt Arial, "Liberation Sans", Helvetica, sans-serif`; return Math.ceil(ctx2d.measureText(t).width * 15 * 1.06); };
    function dataTable(el) {
      const TW = st.tw, size = SZ_T, tight = el.classList.contains("gantt");
      const allRows = [...el.querySelectorAll("tr")];
      const nCols = Math.max(...allRows.map((r) => [...r.children].reduce((a, td) => a + td.colSpan, 0)));
      // Lebar minimum tiap kolom: kolom angka/tanggal/NIP (rata tengah/kanan atau tanpa putus) selebar isinya,
      // kolom teks minimal selebar kata terpanjang, judul kolom minimal selebar kata terpanjangnya
      // Kolom awal setiap sel, memperhitungkan sel rowspan dari baris di atasnya
      const startCol = new Map(), occ = allRows.map(() => []);
      allRows.forEach((tr, ri) => {
        let ci = 0;
        for (const td of tr.children) {
          while (occ[ri][ci]) ci++;
          startCol.set(td, ci);
          for (let r = 0; r < td.rowSpan && ri + r < occ.length; r++) for (let c = 0; c < td.colSpan; c++) occ[ri + r][ci + c] = true;
          ci += td.colSpan;
        }
      });
      const pad = tight ? 70 : 170, need = Array(nCols).fill(0), fixed = Array(nCols).fill(false), want = Array(nCols).fill(0);
      for (const tr of allRows) {
        for (const td of tr.children) {
          const ci = startCol.get(td);
          if (td.colSpan === 1 && ci < nCols) {
            const head = td.tagName === "TH", bold = head || tr.classList.contains("total") || tr.classList.contains("grp");
            const lines = td.innerText.split("\n").map((x) => x.trim()).filter(Boolean);
            const words = lines.flatMap((l) => l.split(/[ \t]+/)).filter(Boolean);
            const maxWord = Math.max(0, ...words.map((w) => textW(w, size, bold)));
            const maxLine = Math.max(0, ...lines.map((l) => textW(l, size, bold)));
            if (head) need[ci] = Math.max(need[ci], maxWord + pad);
            else if (td.classList.contains("nw") || ((td.classList.contains("r") || td.classList.contains("c")) && td.textContent.trim().length <= 16)) { need[ci] = Math.max(need[ci], maxLine + pad); fixed[ci] = true; }
            else { need[ci] = Math.max(need[ci], Math.min(maxWord, 2200) + pad); want[ci] = Math.max(want[ci], Math.min(maxLine, 6000) + pad); }
          }
        }
      }
      if (tight) for (let i = 0; i < nCols; i++) fixed[i] = i !== 1; // tata waktu: hanya kolom tahapan yang melebar
      let colW = need.map((n) => Math.max(n, tight ? 160 : 300));
      // Judul kolom gabungan (mis. nama bulan di atas kolom minggu) tidak boleh terpotong: kekurangan lebarnya dibagi rata
      for (const tr of allRows) for (const td of tr.children) {
        const ci = startCol.get(td);
        if (td.tagName !== "TH" || td.colSpan < 2 || ci + td.colSpan > nCols) continue;
        const words = td.innerText.split(/\s+/).filter(Boolean);
        const req = Math.max(0, ...words.map((w) => textW(w, size, true))) + pad;
        const have = colW.slice(ci, ci + td.colSpan).reduce((a, b) => a + b, 0);
        if (req > have) for (let c = ci; c < ci + td.colSpan; c++) colW[c] += Math.ceil((req - have) / td.colSpan);
      }
      const fixW = colW.reduce((a, w, i) => a + (fixed[i] ? w : 0), 0), flex = colW.map((_, i) => i).filter((i) => !fixed[i]);
      const avail = TW - fixW, sumMin = flex.reduce((a, i) => a + colW[i], 0);
      if (!flex.length) colW = colW.map((w) => Math.round((w * TW) / fixW));
      else if (sumMin <= avail) {
        // Sisa lebar dibagi ke kolom teks sesuai panjang isinya
        const ex = flex.map((i) => Math.max(0, want[i] - colW[i])), exSum = ex.reduce((a, b) => a + b, 0);
        flex.forEach((i, k) => (colW[i] = Math.round(colW[i] + (avail - sumMin) * (exSum ? ex[k] / exSum : 1 / flex.length))));
      } else if (avail > TW * 0.25) flex.forEach((i) => (colW[i] = Math.round((colW[i] * avail) / sumMin)));
      else { const tot = colW.reduce((a, b) => a + b, 0); colW = colW.map((w) => Math.round((w * TW) / tot)); }
      return new D.Table({
        width: { size: 100, type: D.WidthType.PERCENTAGE }, borders,
        columnWidths: colW, layout: colW ? D.TableLayoutType.FIXED : undefined,
        rows: allRows.map((tr) => new D.TableRow({
          tableHeader: tr.parentElement.tagName === "THEAD", cantSplit: true,
          children: [...tr.children].map((td) => {
            const ci = startCol.get(td), w = colW ? colW.slice(ci, ci + td.colSpan).reduce((a, b) => a + b, 0) : 0;
            const head = td.tagName === "TH";
            const align = head || td.classList.contains("c") ? A.CENTER : td.classList.contains("r") ? A.RIGHT : A.LEFT;
            const grp = tr.classList.contains("grp");
            const fill = td.classList.contains("on") ? "FFC000" : head ? "D9D9D9" : tr.classList.contains("total") ? "F2F2F2" : grp ? "EFEFEF" : null;
            return new D.TableCell({
              width: w ? { size: w, type: D.WidthType.DXA } : undefined,
              columnSpan: td.colSpan > 1 ? td.colSpan : undefined, rowSpan: td.rowSpan > 1 ? td.rowSpan : undefined,
              verticalAlign: D.VerticalAlign.CENTER,
              shading: fill ? { type: D.ShadingType.CLEAR, color: "auto", fill } : undefined,
              margins: tight ? { top: 20, bottom: 20, left: 20, right: 20 } : { top: 30, bottom: 30, left: 60, right: 60 },
              children: [new D.Paragraph({ alignment: align, children: runs(td, { size, bold: head || grp || tr.classList.contains("total") || undefined }) })]
            });
          })
        }))
      });
    }

    // Tanda tangan: nama tidak ditebalkan/digarisbawahi (Memorandum, Lampiran 3 dan 4)
    function signCell(td, w, align, gap) {
      const kids = gap ? [textPara("")] : [];
      const sg = td.querySelector(".sg");
      if (sg) for (const d of sg.children) {
        if (d.classList.contains("space")) kids.push(textPara(""), textPara(""), textPara(""), textPara(""));
        else kids.push(textPara(d.textContent.trim(), { alignment: align }));
      }
      return new D.TableCell({ borders: noBorders, width: w ? { size: w, type: D.WidthType.DXA } : undefined, columnSpan: td.colSpan > 1 ? td.colSpan : undefined, children: kids.length ? kids : [textPara("")] });
    }

    async function photoTable(el) {
      const figs = [...el.querySelectorAll("figure")];
      const rows = [];
      for (let i = 0; i < figs.length; i += 2) {
        const cells = [];
        for (const f of figs.slice(i, i + 2)) {
          const img = f.querySelector("img"), cap = f.querySelector("figcaption");
          const kids = [];
          if (img) kids.push(await imagePara(img.src, 250, { maxPx: 900, aspect: 4 / 3 }));
          if (cap) kids.push(para(cap, { alignment: A.CENTER, spacing: { after: 160 } }, { size: SZ_T }));
          else kids.push(textPara("", { spacing: { after: 120 } }));
          cells.push(new D.TableCell({ borders: noBorders, width: { size: 50, type: D.WidthType.PERCENTAGE }, children: kids }));
        }
        if (cells.length === 1) cells.push(new D.TableCell({ borders: noBorders, children: [textPara("")] }));
        rows.push(new D.TableRow({ cantSplit: true, children: cells }));
      }
      return [new D.Table({ width: { size: 100, type: D.WidthType.PERCENTAGE }, borders: noBorders, rows }), textPara("")];
    }

    async function block(el) {
      const tag = el.tagName, cls = el.classList;
      if (cls.contains("noprint")) return [];
      if (cls.contains("cover")) {
        const out = [];
        for (const c of el.children) {
          if (c.tagName === "IMG") out.push(textPara(""), await imagePara(c.src, 210, { maxPx: 800 }), textPara(""));
          else if (c.classList.contains("nologo")) out.push(textPara(""), textPara(""), textPara(""));
          else out.push(para(c, { alignment: A.CENTER, spacing: { before: c.classList.contains("cv-title") ? 0 : 480, line: 360 } }, { bold: true, size: c.classList.contains("cv-title") ? 28 : SZ }));
        }
        return out;
      }
      if (cls.contains("kop")) {
        // Kop Memorandum: logo kiri; dua baris instansi biasa, nama Balai tebal, alamat dan kontak kecil; garis tebal di bawah.
        // Kop melebar 1,5 cm ke margin kiri dan 0,75 cm ke kanan agar baris Direktorat Jenderal muat satu baris.
        const img = el.querySelector("img"), txt = [...el.querySelectorAll(".kop-t > div")];
        const OUT_L = 850, OUT_R = 425, LOGO = 1134, TXT = TW_P + OUT_L + OUT_R - LOGO;
        const left = img ? [await imagePara(img.src, 68, { maxPx: 300 })] : [textPara("")];
        const right = txt.map((d) => textPara(d.textContent.trim(), { alignment: A.CENTER, spacing: { after: 0, line: 240 } },
          d.classList.contains("big") ? { bold: true, size: 28 } : { size: d.classList.contains("addr") ? 16 : 20 }));
        return [new D.Table({ width: { size: LOGO + TXT, type: D.WidthType.DXA }, indent: { size: -OUT_L, type: D.WidthType.DXA }, borders: noBorders, columnWidths: [LOGO, TXT], layout: D.TableLayoutType.FIXED, rows: [new D.TableRow({ children: [
          new D.TableCell({ borders: noBorders, width: { size: LOGO, type: D.WidthType.DXA }, verticalAlign: D.VerticalAlign.CENTER, children: left }),
          new D.TableCell({ borders: noBorders, width: { size: TXT, type: D.WidthType.DXA }, verticalAlign: D.VerticalAlign.CENTER, children: right })] })] }),
          new D.Paragraph({ indent: { left: -OUT_L, right: -OUT_R }, border: { bottom: { style: D.BorderStyle.THICK, size: 18, color: "000000", space: 1 } }, children: [] }), textPara("")];
      }
      // LAPORAN (tebal), baris kosong, TENTANG (biasa), JUDUL KEGIATAN (tebal)
      if (cls.contains("doc-title")) return [...[...el.children].map((c) => (c.classList.contains("gap") ? textPara("", { spacing: { after: 0, line: 360 } }) : para(c, { alignment: A.CENTER, spacing: { after: 0, line: 360 } }, { bold: c.classList.contains("b") || undefined }))), textPara("")];
      if (tag === "P" && cls.contains("fn")) return [para(el, { spacing: { after: 160 } }, { size: SZ_T, italics: true })];
      if (tag === "P" && cls.contains("cap")) {
        // Keterangan tabel dengan field SEQ supaya Daftar Tabel di Word terisi otomatis
        const n = el.dataset.n || "1", rest = el.textContent.replace(/^\s*Tabel\s+\d+\s*/, "");
        return [new D.Paragraph({ style: "Caption", alignment: A.CENTER, keepNext: true, spacing: { before: 120, after: 120 }, children: [new D.TextRun({ text: "Tabel " }), new D.SimpleField("SEQ Tabel \\* ARABIC", n), new D.TextRun({ text: ` ${rest}` })] })];
      }
      if (tag === "P" && cls.contains("li")) return [para(el, { spacing: { after: 60 } })];
      if (cls.contains("toc")) return [el.dataset.toc === "tabel"
        ? new D.TableOfContents("Daftar Tabel", { hyperlink: true, captionLabelIncludingNumbers: "Tabel" })
        : new D.TableOfContents("Daftar Isi", { hyperlink: true, headingStyleRange: "1-2" })];
      if (tag === "H1" && cls.contains("front")) {
        if (/^LAMPIRAN\b/.test(el.textContent.trim())) st.lamp = true;
        return [heading(el, D.HeadingLevel.HEADING_1, 0, 0, true, { alignment: A.CENTER, spacing: { before: 0, after: 360, line: 360 }, children: runs(el, { bold: true, size: el.id === "pengesahan" ? 28 : SZ }) })];
      }
      if (tag === "H1") return [heading(el, D.HeadingLevel.HEADING_1, 0, 0, true)];
      if (tag === "H2") return [cls.contains("lamp") ? heading(el, D.HeadingLevel.HEADING_2, 1, 0, true) : heading(el, D.HeadingLevel.HEADING_2, 1, IND, false)];
      if (tag === "H3") return [heading(el, D.HeadingLevel.HEADING_3, 2, st.lamp ? IND : 2 * IND, false)];
      if (cls.contains("note")) return noteLines(el).map((s) => bodyLineEl(s, lvOf(el)));
      if (tag === "OL") return [...el.children].map((li, i) => itemPara(lvOf(el) * IND, `${i + 1}.`, runs(li)));
      if (tag === "UL" && cls.contains("arrow")) return [...el.children].map((li) => new D.Paragraph({ numbering: { reference: "arrow", level: 0 }, spacing: { after: 0, line: 300 }, children: runs(li) }));
      if (tag === "P" && cls.contains("lamp-head")) return [para(el, { spacing: { before: 360, after: 60 }, indent: { left: IND }, keepNext: true })];
      if (tag === "P" && cls.contains("sub")) return [para(el, { spacing: { before: 120, after: 120, line: 360 }, indent: { left: IND } })];
      if (tag === "P" && cls.contains("para")) return [bodyPara(lvOf(el) * IND, runs(el))];
      if (tag === "P") return [para(el, { spacing: { after: 120 } })];
      if (tag === "TABLE" && cls.contains("kv-plain")) {
        const cw = [2381, 300, st.tw - 2681];
        return [new D.Table({
          width: { size: 100, type: D.WidthType.PERCENTAGE }, borders: noBorders, columnWidths: cw, layout: D.TableLayoutType.FIXED,
          rows: [...el.querySelectorAll("tr")].map((tr) => new D.TableRow({ children: [...tr.children].map((td, i) => new D.TableCell({
            borders: noBorders, width: { size: cw[i], type: D.WidthType.DXA },
            children: td.innerText.split("\n").map((l) => textPara(l, { spacing: { after: 80 } }))
          })) }))
        }), textPara("")];
      }
      if (tag === "TABLE" && cls.contains("sign")) {
        // memo: kiri-kanan lalu tengah, rata tengah; close (penutup laporan): teks rata kiri di kolom kanan
        const close = cls.contains("close"), w0 = Math.round(st.tw * (close ? 0.55 : 0.5)), cw = [w0, st.tw - w0];
        return [textPara(""), new D.Table({ width: { size: 100, type: D.WidthType.PERCENTAGE }, borders: noBorders, columnWidths: cw, layout: D.TableLayoutType.FIXED,
          rows: [...el.querySelectorAll("tr")].map((tr, ri) => new D.TableRow({ cantSplit: true, children: [...tr.children].map((td, k) => signCell(td, td.colSpan > 1 ? st.tw : cw[k], close ? A.LEFT : A.CENTER, ri > 0)) })) })];
      }
      if (tag === "TABLE") return [dataTable(el), textPara("")];
      if (tag === "FIGURE" && cls.contains("map")) return [await imagePara(el.querySelector("img").src, Math.round(st.tw / 15), { maxPx: 1600, maxH: 640 }), textPara("")];
      if (tag === "FIGURE" && cls.contains("scan")) return [await imagePara(el.querySelector("img").src, PAGE_W_PX, { maxPx: 2000, maxH: 760 })];
      if (tag === "DIV" && cls.contains("photos")) return photoTable(el);
      if (tag === "DIV" || tag === "SECTION") {
        const out = [];
        for (const c of el.children) out.push(...(await block(c)));
        return out;
      }
      return [];
    }
    return { D, st, block, runs, textPara };
  }

  function docStyles() {
    const h = (id, name, lvl) => ({ id, name, basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: SZ, color: "000000" }, paragraph: { outlineLevel: lvl, keepNext: true } });
    return {
      default: { document: { run: { font: FONT, size: SZ } } },
      paragraphStyles: [h("Heading1", "Heading 1", 0), h("Heading2", "Heading 2", 1), h("Heading3", "Heading 3", 2),
        { id: "Caption", name: "caption", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: SZ, bold: true, color: "000000" } }]
    };
  }
  const docNumbering = (D) => ({ config: [{ reference: "arrow", levels: [{ level: 0, format: D.LevelFormat.BULLET, text: "", alignment: D.AlignmentType.LEFT,
    style: { run: { font: "Wingdings" }, paragraph: { indent: { left: 2 * IND, hanging: IND } } } }] }] });
  const PAGE = { size: { width: 11906, height: 16838 }, margin: { top: 1701, bottom: 1701, left: 2268, right: 1701 } };
  // Halaman mendatar untuk matriks lampiran: sisi jilid (4 cm) di atas
  const PAGE_L = { size: { width: 11906, height: 16838, orientation: "landscape" }, margin: { top: 2268, bottom: 1701, left: 1701, right: 1701 } };

  // Sampul (tanpa nomor), halaman awal (i, ii, …), isi (1, 2, …); blok .landscape di isi dicetak mendatar dengan nomor halaman berlanjut
  async function docx(reportEl, M, onProgress, opts = {}) {
    const B = makeBuilder(), D = B.D;
    const secs = [...reportEl.querySelectorAll(":scope > section")];
    const pick = (c) => secs.find((s) => s.classList.contains(c));
    const coverEl = pick("sec-cover"), front = pick("sec-front"), body = pick("sec-body");
    const conv = async (els, label, landscape) => {
      B.st.tw = landscape ? TW_L : TW_P;
      const out = [];
      for (let i = 0; i < els.length; i++) {
        onProgress && onProgress(`Menyusun ${label}… ${Math.round((i / els.length) * 100)}%`);
        B.st.noPB = i === 0;
        out.push(...(await B.block(els[i])));
      }
      B.st.noPB = false;
      return out;
    };
    const footer = () => ({ default: new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ children: [D.PageNumber.CURRENT] })] })] }) });
    const sections = [];
    if (coverEl) sections.push({ properties: { page: PAGE }, children: await conv([...coverEl.children], "sampul") });
    if (front) sections.push({ properties: { page: { ...PAGE, pageNumbers: { start: 1, formatType: D.NumberFormat.LOWER_ROMAN } } }, footers: footer(), children: await conv([...front.children], "lembar pengesahan dan daftar isi") });
    const chunks = [{ land: false, els: [] }];
    for (const e of body.children) {
      if (e.classList.contains("landscape")) chunks.push({ land: true, els: [...e.children] }, { land: false, els: [] });
      else chunks[chunks.length - 1].els.push(e);
    }
    let first = true;
    for (const ch of chunks.filter((c) => c.els.length)) {
      const kids = await conv(ch.els, ch.land ? "lampiran" : "isi laporan", ch.land);
      sections.push({ properties: { page: { ...(ch.land ? PAGE_L : PAGE), pageNumbers: first ? { start: 1, formatType: D.NumberFormat.DECIMAL } : { formatType: D.NumberFormat.DECIMAL } } }, footers: footer(), children: kids });
      first = false;
    }
    const doc = new D.Document({
      creator: "Generator LPK & RPK SMART Patrol", title: opts.title || `Laporan ${M.patrol.id}`, styles: docStyles(), numbering: docNumbering(D), features: { updateFields: true }, sections
    });
    const blob = await D.Packer.toBlob(doc);
    if (opts.returnBlob) return blob;
    download(blob, opts.fileName || `LPK_${safeName(M.patrol.id)}.docx`);
  }

  /* ---------- Isi template Word milik sendiri ---------- */
  const TEXT_KEYS = ["nomor_st", "judul", "judul_lengkap", "lokasi", "periode", "tanggal_mulai", "tanggal_selesai", "tanggal_st", "jumlah_hari", "jarak_km", "jumlah_temuan", "jumlah_titik", "jumlah_anggota", "ketua_tim", "nip_ketua", "daftar_anggota", "grid", "resor", "anggaran", "sumber_anggaran", "tanggal_laporan", "kota", "latar", "maksud", "ruanglingkup", "hasil", "pembahasan", "kesimpulan", "saran"];
  function textFields(M, notes, I) {
    if (!M || !I) return Object.fromEntries(TEXT_KEYS.map((k) => [k, ""]));
    const t = M.totals, R = window.SRGReport;
    return {
      nomor_st: I.nomorST, judul: I.judul, judul_lengkap: I.judulLengkap, lokasi: I.lokasi, periode: R.periodeSd(I.mulai, I.selesai),
      tanggal_mulai: R.tglPanjang(I.mulai), tanggal_selesai: R.tglPanjang(I.selesai), tanggal_st: I.tanggalST ? R.tglPanjang(I.tanggalST) : "",
      jumlah_hari: String(I.hari), jarak_km: R.num(t.distance / 1000, 1), jumlah_temuan: String(t.obs), jumlah_titik: String(t.wps), jumlah_anggota: String(M.members.length),
      ketua_tim: M.leader ? M.leader.name : "", nip_ketua: M.leader ? R.fmtNip(M.leader.nip) : "",
      daftar_anggota: M.members.map((m, i) => `${i + 1}. ${m.name}`).join("\n"), grid: I.grids, resor: I.resort, anggaran: I.anggaran, sumber_anggaran: I.sumberAnggaran,
      tanggal_laporan: R.tglPanjang(I.tanggalLaporan), kota: I.kota,
      latar: notes.latar, maksud: notes.maksud, ruanglingkup: notes.ruanglingkup, hasil: notes.hasil, pembahasan: notes.pembahasan, kesimpulan: notes.kesimpulan, saran: notes.saran
    };
  }
  const BLOCKS = ["tabel_anggota", "peta", "tabel_temuan", "foto", "tanda_tangan"];

  // Pecah anak-anak level atas sebuah elemen XML (string) menjadi daftar string.
  function topLevelChildren(xml) {
    const out = [], re = /<(\/?)([\w:]+)[^>]*?(\/?)>/g;
    let depth = 0, start = -1, m;
    while ((m = re.exec(xml))) {
      if (m[1]) { depth--; if (depth === 0) out.push(xml.slice(start, re.lastIndex)); }
      else if (m[3]) { if (depth === 0) out.push(m[0]); }
      else { if (depth === 0) start = m.index; depth++; }
    }
    return out;
  }
  function splitRuns(xml) {
    return xml.replace(/<w:r(\s[^>]*)?>([\s\S]*?)<\/w:r>/g, (whole, attrs, inner) => {
      const kids = topLevelChildren(inner);
      const rPr = kids.find((k) => /^<w:rPr[\s>\/]/.test(k)) || "";
      const content = kids.filter((k) => k !== rPr);
      if (content.length <= 1 || !content.some((k) => k.startsWith("<w:t"))) return whole;
      return content.map((c) => `<w:r${attrs || ""}>${rPr}${c}</w:r>`).join("");
    });
  }
  async function normalizeTemplate(buf) {
    if (!window.JSZip) return buf;
    const zip = await JSZip.loadAsync(buf);
    for (const name of Object.keys(zip.files).filter((n) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n))) {
      zip.file(name, splitRuns(await zip.file(name).async("string")));
    }
    return zip.generateAsync({ type: "uint8array" });
  }

  async function fillTemplate(templateBuf, reportEl, M, notes, onProgress, I) {
    const B = makeBuilder(), D = B.D;
    const patches = {};
    for (const [k, v] of Object.entries(textFields(M, notes, I))) {
      // teks kosong menghasilkan run tanpa isi yang membuat patcher docx galat, jadi diganti spasi
      const lines = String(v ?? "").split("\n").map((l) => l || " ");
      patches[k] = { type: D.PatchType.PARAGRAPH, children: lines.map((l, i) => new D.TextRun({ text: l, break: i ? 1 : 0 })) };
    }
    for (const b of BLOCKS) {
      onProgress && onProgress(`Menyiapkan ${b}…`);
      const el = reportEl.querySelector(`[data-block="${b}"]`);
      const kids = el ? await B.block(el) : [B.textPara("-")];
      patches[b] = { type: D.PatchType.DOCUMENT, children: kids.length ? kids : [B.textPara("-")] };
    }
    onProgress && onProgress("Mengisi placeholder…");
    const clean = await normalizeTemplate(templateBuf);
    const out = await Promise.race([
      D.patchDocument(clean, { patches, keepOriginalStyles: true }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("waktu habis; periksa apakah placeholder ditulis utuh tanpa format berbeda di tengahnya")), 90000))
    ]).catch((e) => { console.error(e); throw new Error(/Token not found/.test(e.message) ? "ada placeholder yang terpecah format. Ketik ulang placeholder itu sekaligus di template." : e.message); });
    download(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), `Laporan_${safeName(M.patrol.id)}.docx`);
  }

  window.SRGExport = { safeName, makeBuilder, normalizeTemplate, splitRuns, csv, geojson, kml, docx, fillTemplate, textFields, BLOCKS, download };
})();
