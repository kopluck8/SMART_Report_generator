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

  /* ---------- Word (.docx) format LPK ---------- */
  // A4, margin kiri 4 cm, lainnya 3 cm: lebar isi 14 cm ≈ 529 px pada 96 dpi
  const PAGE_W_PX = 525;
  const FONT = "Times New Roman";

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
    const none = { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" };
    const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
    const thin = { style: D.BorderStyle.SINGLE, size: 4, color: "000000" };
    const borders = { top: thin, bottom: thin, left: thin, right: thin, insideHorizontal: thin, insideVertical: thin };
    const BODY = { line: 360, after: 0 };

    // Teks inline -> TextRun (menangani <b>, <i>, <br>, <small>)
    function runs(node, fmt = {}, out = []) {
      for (const c of node.childNodes) {
        if (c.nodeType === 3) { const t = c.textContent.replace(/\s+/g, " "); if (t.trim() || (t === " " && out.length)) out.push(new D.TextRun({ text: t, ...fmt })); }
        else if (c.nodeType === 1) {
          const tag = c.tagName;
          if (tag === "BR") out.push(new D.TextRun({ text: " ", break: 1, ...fmt }));
          else if (tag === "B" || tag === "STRONG") runs(c, { ...fmt, bold: true }, out);
          else if (tag === "SMALL") runs(c, { ...fmt, size: (fmt.size || 24) - 2 }, out);
          else if (tag === "I" || tag === "EM") runs(c, { ...fmt, italics: true }, out);
          else runs(c, fmt, out);
        }
      }
      if (!out.length) out.push(new D.TextRun({ text: " ", ...fmt }));
      return out;
    }
    const para = (el, opts = {}, fmt = {}) => new D.Paragraph({ children: runs(el, fmt), ...opts });
    const textPara = (text, opts = {}, fmt = {}) => new D.Paragraph({ children: [new D.TextRun({ text: text || " ", ...fmt })], ...opts });
    const numbered = (n, text, fmt = {}) => new D.Paragraph({ alignment: D.AlignmentType.JUSTIFIED, spacing: BODY, indent: { left: 720, hanging: 360 }, children: [new D.TextRun({ text: `${n}.\t${text}`, ...fmt })], tabStops: [{ type: D.TabStopType.LEFT, position: 720 }] });
    const bodyLine = (text) => {
      const m = text.match(/^(\d+)[.)]\s+(.*)$/);
      return m ? numbered(m[1], m[2]) : new D.Paragraph({ alignment: D.AlignmentType.JUSTIFIED, spacing: BODY, indent: { firstLine: 720 }, children: [new D.TextRun({ text })] });
    };

    async function imagePara(src, widthPx, opts = {}) {
      const im = await imageData(src, opts.maxPx || 1600, opts.aspect);
      let w = widthPx, h = Math.round((widthPx * im.h) / im.w);
      if (opts.maxH && h > opts.maxH) { w = Math.round((w * opts.maxH) / h); h = opts.maxH; }
      return new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.ImageRun({ data: im.data, transformation: { width: w, height: h } })] });
    }

    function dataTable(el) {
      const small = el.classList.contains("detail") || el.classList.contains("gantt");
      const size = small ? 18 : 20;
      // Lebar kolom mengikuti tata letak di layar, supaya kolom teks tidak terjepit
      const ref = [...el.querySelectorAll("tr")].find((tr) => [...tr.children].every((td) => td.colSpan === 1 && td.rowSpan === 1) && tr.children.length === Math.max(...[...el.querySelectorAll("tr")].map((r) => [...r.children].reduce((a, td) => a + td.colSpan, 0))));
      const px = ref ? [...ref.children].map((td) => td.getBoundingClientRect().width) : [];
      const tot = px.reduce((a, b) => a + b, 0);
      const colW = tot > 0 ? px.map((w) => Math.max(300, Math.round((w / tot) * 7937))) : undefined;
      return new D.Table({
        width: { size: 100, type: D.WidthType.PERCENTAGE }, borders,
        columnWidths: colW, layout: colW ? D.TableLayoutType.FIXED : undefined,
        rows: [...el.querySelectorAll("tr")].map((tr) => new D.TableRow({
          tableHeader: tr.parentElement.tagName === "THEAD",
          children: [...tr.children].map((td) => {
            const head = td.tagName === "TH";
            const align = head || td.classList.contains("c") ? D.AlignmentType.CENTER : td.classList.contains("r") ? D.AlignmentType.RIGHT : D.AlignmentType.LEFT;
            const fill = td.classList.contains("on") ? "FFC000" : head ? "D9D9D9" : tr.classList.contains("total") ? "F2F2F2" : null;
            return new D.TableCell({
              columnSpan: td.colSpan > 1 ? td.colSpan : undefined, rowSpan: td.rowSpan > 1 ? td.rowSpan : undefined,
              verticalAlign: D.VerticalAlign.CENTER,
              shading: fill ? { type: D.ShadingType.CLEAR, color: "auto", fill } : undefined,
              margins: { top: 30, bottom: 30, left: 60, right: 60 },
              children: [new D.Paragraph({ alignment: align, children: runs(td, { size, bold: head || tr.classList.contains("total") || undefined }) })]
            });
          })
        }))
      });
    }

    function signCell(td) {
      const kids = [];
      const sg = td.querySelector(".sg");
      if (sg) for (const d of sg.children) {
        if (d.classList.contains("space")) kids.push(textPara(""), textPara(""), textPara(""));
        else kids.push(textPara(d.textContent.trim(), { alignment: D.AlignmentType.CENTER }, d.classList.contains("nm") ? { bold: true, underline: {} } : {}));
      }
      return new D.TableCell({ borders: noBorders, columnSpan: td.colSpan > 1 ? td.colSpan : undefined, children: kids.length ? kids : [textPara("")] });
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
          if (cap) kids.push(para(cap, { alignment: D.AlignmentType.CENTER, spacing: { after: 160 } }, { size: 20 }));
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
          else out.push(para(c, { alignment: D.AlignmentType.CENTER, spacing: { before: c.classList.contains("cv-title") ? 0 : 480, line: 360 } }, { bold: true, size: c.classList.contains("cv-title") ? 28 : 24 }));
        }
        return out;
      }
      if (cls.contains("toc")) return [new D.TableOfContents("Daftar Isi", { hyperlink: true, headingStyleRange: "1-2" })];
      if (tag === "H1") return [new D.Paragraph({ heading: D.HeadingLevel.HEADING_1, alignment: D.AlignmentType.CENTER, pageBreakBefore: cls.contains("pb"), spacing: { after: 360, line: 360 }, children: runs(el, { bold: true }) })];
      if (tag === "H2") return [new D.Paragraph({ heading: D.HeadingLevel.HEADING_2, pageBreakBefore: cls.contains("pb"), spacing: { before: 240, after: 120, line: 360 }, children: runs(el, { bold: true }) })];
      if (tag === "H3") return [new D.Paragraph({ heading: D.HeadingLevel.HEADING_3, spacing: { before: 200, after: 80, line: 360 }, indent: { left: 360 }, children: runs(el, { bold: true }) })];
      if (cls.contains("note")) return el.innerText.split(/\n/).map((l) => l.trim()).filter(Boolean).map(bodyLine);
      if (tag === "OL") return [...el.children].map((li, i) => numbered(i + 1, li.textContent.trim()));
      if (tag === "P" && cls.contains("sub")) return [para(el, { spacing: { before: 120, after: 120, line: 360 }, indent: { left: 360 } })];
      if (tag === "P" && cls.contains("para")) return [para(el, { alignment: D.AlignmentType.JUSTIFIED, spacing: BODY, indent: { firstLine: 720 } })];
      if (tag === "P") return [para(el, { spacing: { after: 120 } })];
      if (tag === "TABLE" && cls.contains("kv-plain")) {
        return [new D.Table({
          width: { size: 100, type: D.WidthType.PERCENTAGE }, borders: noBorders,
          rows: [...el.querySelectorAll("tr")].map((tr) => new D.TableRow({ children: [...tr.children].map((td, i) => new D.TableCell({
            borders: noBorders, width: { size: [30, 3, 67][i], type: D.WidthType.PERCENTAGE },
            children: td.innerText.split("\n").map((l) => textPara(l, { spacing: { after: 60 } }))
          })) }))
        }), textPara("")];
      }
      if (tag === "TABLE" && cls.contains("sign")) {
        return [textPara(""), new D.Table({ width: { size: 100, type: D.WidthType.PERCENTAGE }, borders: noBorders,
          rows: [...el.querySelectorAll("tr")].map((tr) => new D.TableRow({ cantSplit: true, children: [...tr.children].map(signCell) })) })];
      }
      if (tag === "TABLE") return [dataTable(el), textPara("")];
      if (tag === "FIGURE" && cls.contains("map")) return [await imagePara(el.querySelector("img").src, PAGE_W_PX, { maxPx: 1600 }), textPara("")];
      if (tag === "FIGURE" && cls.contains("scan")) return [await imagePara(el.querySelector("img").src, PAGE_W_PX, { maxPx: 2000, maxH: 760 })];
      if (tag === "DIV" && cls.contains("photos")) return photoTable(el);
      if (tag === "DIV" || tag === "SECTION") {
        const out = [];
        for (const c of el.children) out.push(...(await block(c)));
        return out;
      }
      return [];
    }
    return { D, block, runs, textPara };
  }

  function docStyles() {
    const h = (id, name, extra = {}) => ({ id, name, basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 24, bold: true, color: "000000" }, ...extra });
    return {
      default: { document: { run: { font: FONT, size: 24 } } },
      paragraphStyles: [h("Heading1", "Heading 1"), h("Heading2", "Heading 2"), h("Heading3", "Heading 3")]
    };
  }
  const PAGE = { size: { width: 11906, height: 16838 }, margin: { top: 1701, bottom: 1701, left: 2268, right: 1701 } };

  async function docx(reportEl, M, onProgress) {
    const B = makeBuilder(), D = B.D;
    const sectionsEls = [...reportEl.querySelectorAll(":scope > section")];
    const front = sectionsEls.find((s) => s.classList.contains("sec-front")), body = sectionsEls.find((s) => s.classList.contains("sec-body"));
    const cover = front.querySelector(".cover");
    const conv = async (els, label) => {
      const out = [];
      for (let i = 0; i < els.length; i++) { onProgress && onProgress(`Menyusun ${label}… ${Math.round((i / els.length) * 100)}%`); out.push(...(await B.block(els[i]))); }
      return out;
    };
    const coverKids = await conv([cover], "sampul");
    const frontEls = [...front.children].filter((e) => e !== cover);
    const frontKids = await conv(frontEls, "pengesahan");
    if (frontKids[0] && frontEls[0].tagName === "H1") frontKids[0] = B.textPara("LEMBAR PENGESAHAN", { heading: D.HeadingLevel.HEADING_1, alignment: D.AlignmentType.CENTER, spacing: { after: 360 } }, { bold: true });
    const bodyEls = [...body.children];
    const bodyKids = await conv(bodyEls, "isi laporan");
    if (bodyEls[0] && bodyEls[0].tagName === "H1") bodyKids[0] = new D.Paragraph({ heading: D.HeadingLevel.HEADING_1, alignment: D.AlignmentType.CENTER, spacing: { after: 360, line: 360 }, children: B.runs(bodyEls[0], { bold: true }) });
    const footer = (fmt) => ({ default: new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ children: [D.PageNumber.CURRENT] })] })] }) });
    const doc = new D.Document({
      creator: "Generator LPK SMART Patrol", title: `Laporan ${M.patrol.id}`, styles: docStyles(), features: { updateFields: true },
      sections: [
        { properties: { page: PAGE }, children: coverKids },
        { properties: { page: { ...PAGE, pageNumbers: { start: 1, formatType: D.NumberFormat.LOWER_ROMAN } } }, footers: footer(), children: frontKids },
        { properties: { page: { ...PAGE, pageNumbers: { start: 1, formatType: D.NumberFormat.DECIMAL } } }, footers: footer(), children: bodyKids }
      ]
    });
    const blob = await D.Packer.toBlob(doc);
    download(blob, `LPK_${safeName(M.patrol.id)}.docx`);
  }

  /* ---------- Isi template Word milik sendiri ---------- */
  const TEXT_KEYS = ["nomor_st", "judul", "judul_lengkap", "lokasi", "periode", "tanggal_mulai", "tanggal_selesai", "tanggal_st", "jumlah_hari", "jarak_km", "jumlah_temuan", "jumlah_titik", "jumlah_anggota", "ketua_tim", "nip_ketua", "daftar_anggota", "grid", "resor", "anggaran", "sumber_anggaran", "tanggal_laporan", "kota", "latar", "maksud", "ruanglingkup", "hasil", "pembahasan", "kesimpulan", "saran"];
  function textFields(M, notes, I) {
    if (!M || !I) return Object.fromEntries(TEXT_KEYS.map((k) => [k, ""]));
    const p = M.patrol, t = M.totals, R = window.SRGReport;
    return {
      nomor_st: p.id, judul: I.judul, judul_lengkap: I.judulLengkap, lokasi: I.lokasi, periode: R.periodeSd(p.startDate, p.endDate),
      tanggal_mulai: R.tglPanjang(p.startDate), tanggal_selesai: R.tglPanjang(p.endDate), tanggal_st: I.tanggalST ? R.tglPanjang(I.tanggalST) : "",
      jumlah_hari: String(t.days), jarak_km: R.num(t.distance / 1000, 1), jumlah_temuan: String(t.obs), jumlah_titik: String(t.wps), jumlah_anggota: String(M.members.length),
      ketua_tim: M.leader ? M.leader.name : "", nip_ketua: M.leader ? R.fmtNip(M.leader.employeeId) : "",
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

  window.SRGExport = { makeBuilder, normalizeTemplate, splitRuns, csv, geojson, kml, docx, fillTemplate, textFields, BLOCKS, download };
})();
