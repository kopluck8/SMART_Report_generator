/*
 * Peta statis (gambar) untuk laporan: lintasan per hari + titik temuan.
 * Dibuat sebagai gambar agar ikut tercetak di PDF dan masuk ke file Word.
 */
(function () {
  "use strict";

  const BASEMAPS = {
    none: null,
    osm: { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", credit: "© OpenStreetMap contributors" },
    satelit: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", credit: "Citra: Esri, Maxar, Earthstar Geographics" },
    topo: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", credit: "Peta dasar: Esri" }
  };

  const projX = (lon, z) => ((lon + 180) / 360) * 256 * 2 ** z;
  const projY = (lat, z) => {
    const s = Math.sin((lat * Math.PI) / 180);
    return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 256 * 2 ** z;
  };

  function loadTile(url, timeout) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      const t = setTimeout(() => resolve(null), timeout);
      img.onload = () => { clearTimeout(t); resolve(img); };
      img.onerror = () => { clearTimeout(t); resolve(null); };
      img.src = url;
    });
  }

  // Simbologi zonasi resmi Balai TN Tambora
  const ZONA_COLORS = { inti: "#ff0000", khusus: "#6e6e6e", pemanfaatan: "#4ce600", rehabilitasi: "#00c5ff", rimba: "#ffff00", tradisional: "#732600", religi: "#c77dff", budaya: "#c77dff" };
  const SPARE = ["#f4a261", "#90be6d", "#f28482", "#84a59d", "#cdb4db"];
  const spareMap = {};
  function zonaColor(label) {
    const k = Object.keys(ZONA_COLORS).find((n) => label.toLowerCase().includes(n));
    if (k) return ZONA_COLORS[k];
    if (!spareMap[label]) spareMap[label] = SPARE[Object.keys(spareMap).length % SPARE.length];
    return spareMap[label];
  }

  function niceScale(maxMeters) {
    const p = 10 ** Math.floor(Math.log10(maxMeters));
    for (const m of [5, 2, 1]) if (m * p <= maxMeters) return m * p;
    return p;
  }

  /**
   * opts: { width, height, lines:[{coords:[[lon,lat]], color, label}], points:[{lon,lat,color,label}],
   *         legend:[{color,label,type}], basemap, title }
   * Hasil: { dataUrl, width, height, tilesOk }
   */
  async function render(opts) {
    // Tata letak peta: bingkai peta di kiri, kolom informasi peta di kanan (tanpa tanda tangan)
    const FW = opts.width || 1600, FH = opts.height || 1250;
    const MX = 64, MY = 54, SW = 430, W = FW - MX - SW - 64, H = FH - MY * 2;
    const all = [];
    // fit "points": peta diperbesar ke titik temuan (minimal ±1,5 km), lintasan tetap digambar
    if (opts.fit === "points" && opts.points.length) {
      opts.points.forEach((p) => all.push([p.lon, p.lat]));
      const cx0 = all.reduce((s, c) => s + c[0], 0) / all.length, cy0 = all.reduce((s, c) => s + c[1], 0) / all.length;
      all.push([cx0 - 0.014, cy0 - 0.014], [cx0 + 0.014, cy0 + 0.014]);
    } else {
      opts.lines.forEach((l) => l.coords.forEach((c) => all.push(c)));
      opts.points.forEach((p) => all.push([p.lon, p.lat]));
    }
    if (!all.length) return null;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [lon, lat] of all) {
      minX = Math.min(minX, lon); maxX = Math.max(maxX, lon);
      minY = Math.min(minY, lat); maxY = Math.max(maxY, lat);
    }
    const pad = 70;
    let z = 17;
    while (z > 2) {
      const w = projX(maxX, z) - projX(minX, z), h = projY(minY, z) - projY(maxY, z);
      if (w <= W - pad * 2 && h <= H - pad * 2) break;
      z--;
    }
    const cx = (projX(minX, z) + projX(maxX, z)) / 2, cy = (projY(minY, z) + projY(maxY, z)) / 2;
    const ox = cx - W / 2, oy = cy - H / 2;
    const px = (lon, lat) => [projX(lon, z) - ox, projY(lat, z) - oy];

    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#eef1ec";
    ctx.fillRect(0, 0, W, H);

    // Peta dasar (opsional). Jika ubin gagal dimuat, peta tetap jadi tanpa latar.
    let tilesOk = false;
    const bm = BASEMAPS[opts.basemap];
    if (bm) {
      const jobs = [];
      for (let tx = Math.floor(ox / 256); tx <= Math.floor((ox + W) / 256); tx++)
        for (let ty = Math.floor(oy / 256); ty <= Math.floor((oy + H) / 256); ty++) {
          const url = bm.url.replace("{z}", z).replace("{x}", tx).replace("{y}", ty);
          jobs.push(loadTile(url, 10000).then((img) => ({ img, tx, ty })));
        }
      const tiles = await Promise.all(jobs);
      for (const t of tiles) if (t.img) { ctx.drawImage(t.img, t.tx * 256 - ox, t.ty * 256 - oy); tilesOk = true; }
      try { canvas.toDataURL(); } catch (e) { tilesOk = false; ctx.fillStyle = "#eef1ec"; ctx.fillRect(0, 0, W, H); }
    }
    if (!tilesOk) {
      // grid tipis sebagai pengganti peta dasar
      ctx.strokeStyle = "rgba(0,0,0,0.06)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    }

    // Lapisan kawasan, digambar berurutan: zonasi (isi warna), batas, resor, jalur, grid (garis + nomor)
    const ORDER = { zonasi: 0, batas: 1, resort: 2, lain: 3, jalur: 4, grid: 5 };
    const ringPath = (ring) => { ring.forEach((c, i) => { const [x, y] = px(c[0], c[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); };
    const linePath = (line) => line.forEach((c, i) => { const [x, y] = px(c[0], c[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    const polys = (g) => (g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);
    const lineParts = (g) => (g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : []);
    const visible = (f) => f.geometry && !(f._bbox && (f._bbox[2] < vMinX || f._bbox[0] > vMaxX || f._bbox[3] < vMinY || f._bbox[1] > vMaxY));
    // batas tampilan peta dalam derajat
    const vMinX = (ox / (256 * 2 ** z)) * 360 - 180, vMaxX = ((ox + W) / (256 * 2 ** z)) * 360 - 180;
    const unY = (y) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / (256 * 2 ** z)))) * 180) / Math.PI;
    const vMaxY = unY(oy), vMinY = unY(oy + H);
    const layerLegend = [], zonaSeen = new Set();
    const STYLE = {
      batas: { color: "#b71c1c", width: 3, dash: [], label: "Batas kawasan" },
      resort: { color: "#6a1b9a", width: 2, dash: [10, 6], label: "Batas resor" },
      jalur: { color: "#212121", width: 1.3, dash: [], label: "Jalur (peta jalur Balai)" },
      lain: { color: "#7a1f1f", width: 2, dash: [], label: "" }
    };
    for (const layer of [...(opts.layers || [])].sort((a, b) => (ORDER[a.role] ?? 3) - (ORDER[b.role] ?? 3))) {
      let drawn = false;
      const st = STYLE[layer.role] || STYLE.lain;
      for (const f of layer.features) {
        if (!visible(f)) continue;
        const label = String(f.properties?.[layer.field] ?? "").trim();
        for (const rings of polys(f.geometry)) {
          ctx.beginPath(); rings.forEach(ringPath);
          if (layer.role === "zonasi") {
            const c = zonaColor(label);
            if (!zonaSeen.has(label)) { zonaSeen.add(label); layerLegend.push({ type: "area", color: c, label, zona: true }); }
            ctx.fillStyle = c + (opts.basemap && opts.basemap !== "none" ? "99" : "cc"); ctx.fill("evenodd");
            ctx.strokeStyle = "rgba(60,60,60,0.45)"; ctx.lineWidth = 1; ctx.stroke();
          } else if (layer.role === "grid") {
            ctx.strokeStyle = "rgba(20,20,20,0.7)"; ctx.lineWidth = 1; ctx.stroke();
          } else {
            ctx.setLineDash(st.dash); ctx.strokeStyle = st.color; ctx.lineWidth = st.width; ctx.stroke(); ctx.setLineDash([]);
          }
          drawn = true;
        }
        for (const part of lineParts(f.geometry)) {
          ctx.beginPath(); linePath(part);
          ctx.setLineDash(st.dash); ctx.strokeStyle = st.color; ctx.lineWidth = st.width; ctx.stroke(); ctx.setLineDash([]);
          drawn = true;
        }
        if (layer.role === "grid" && label && f._bbox) {
          const [x, y] = px((f._bbox[0] + f._bbox[2]) / 2, (f._bbox[1] + f._bbox[3]) / 2);
          const [x2] = px(f._bbox[2], f._bbox[1]), [x1] = px(f._bbox[0], f._bbox[1]);
          if (x > -20 && x < W + 20 && y > -20 && y < H + 20 && x2 - x1 > 16) {
            ctx.font = `bold ${Math.min(18, Math.max(9, (x2 - x1) / 3.5))}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.strokeText(label, x, y);
            ctx.fillStyle = "#111"; ctx.fillText(label, x, y); ctx.textBaseline = "alphabetic";
          }
        }
      }
      if (drawn && st.label && layer.role !== "zonasi" && layer.role !== "grid") layerLegend.push({ type: "line", color: st.color, label: st.label, dash: st.dash.length > 0 });
      if (drawn && layer.role === "grid") layerLegend.push({ type: "area", color: "#ffffff", label: "Grid (nomor Grid ID)" });
    }

    // Lintasan
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    for (const l of opts.lines) {
      if (l.coords.length < 2) continue;
      for (const [w, c] of [[7, "rgba(255,255,255,0.85)"], [3.5, l.color]]) {
        ctx.beginPath();
        l.coords.forEach((co, i) => { const [x, y] = px(co[0], co[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.globalAlpha = l.alpha ?? 1;
        ctx.strokeStyle = c; ctx.lineWidth = w * (l.width ?? 1); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    // Titik temuan
    for (const p of opts.points) {
      const [x, y] = px(p.lon, p.lat);
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = "#fff"; ctx.stroke();
    }
    // Awal & akhir
    const first = opts.lines.find((l) => l.coords.length), last = [...opts.lines].reverse().find((l) => l.coords.length);
    const flag = (co, txt, col) => {
      if (!co) return;
      const [x, y] = px(co[0], co[1]);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 11, y - 22); ctx.lineTo(x + 11, y - 22); ctx.closePath();
      ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = "bold 20px sans-serif"; ctx.fillStyle = "#111"; ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 5; ctx.strokeText(txt, x, y - 28); ctx.fillText(txt, x, y - 28);
    };
    if (first) flag(first.coords[0], "Mulai", "#1a7f37");
    if (last) flag(last.coords[last.coords.length - 1], "Selesai", "#b42318");

    const midLat = (minY + maxY) / 2;
    const mpp = (156543.03392 * Math.cos((midLat * Math.PI) / 180)) / 2 ** z;
    const lonAt = (x) => ((ox + x) / (256 * 2 ** z)) * 360 - 180;
    const latAt = (y) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * (oy + y)) / (256 * 2 ** z)))) * 180) / Math.PI;
    return compose({ opts, canvas, W, H, FW, FH, MX, MY, SW, mpp, lonAt, latAt, layerLegend, tilesOk, bm, z });
  }

  /* ---------- Tata letak peta ---------- */
  const loadImg = (src) => new Promise((res) => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  const dms = (v, pos, neg) => {
    const a = Math.abs(v), d = Math.floor(a + 1e-9), mf = (a - d) * 60, m = Math.floor(mf + 1e-9), sec = Math.round((mf - m) * 60);
    return `${d}°${String(m).padStart(2, "0")}'${sec ? String(sec).padStart(2, "0") + '"' : ""}${v >= 0 ? pos : neg}`;
  };
  function wrap(ctx, text, maxW) {
    const out = [];
    for (const para of String(text).split("\n")) {
      let line = "";
      for (const w of para.split(" ")) { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
      out.push(line);
    }
    return out;
  }

  async function compose(c) {
    const { opts, W, H, FW, FH, MX, MY, SW, mpp, lonAt, latAt, layerLegend } = c;
    const out = document.createElement("canvas");
    out.width = FW; out.height = FH;
    const g = out.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, FW, FH);
    g.drawImage(c.canvas, MX, MY);
    // Bingkai peta dan angka koordinat (6)
    g.strokeStyle = "#111"; g.lineWidth = 2; g.strokeRect(MX, MY, W, H);
    g.lineWidth = 1; g.strokeRect(MX - 8, MY - 8, W + 16, H + 16);
    const span = lonAt(W) - lonAt(0);
    const STEPS = [1, 2, 5, 10, 15, 30, 60, 120].map((m) => m / 60).concat([10, 30].map((x) => x / 3600));
    const step = STEPS.sort((a, b) => a - b).find((st) => span / st <= 5) || 1;
    g.font = "17px sans-serif"; g.fillStyle = "#111";
    for (let lon = Math.ceil(lonAt(0) / step) * step; lon < lonAt(W); lon += step) {
      const x = MX + ((lon - lonAt(0)) / span) * W;
      g.beginPath(); g.moveTo(x, MY - 8); g.lineTo(x, MY + 10); g.moveTo(x, MY + H - 10); g.lineTo(x, MY + H + 8); g.stroke();
      g.textAlign = "center"; g.fillText(dms(lon, "E", "W"), x, MY - 16); g.fillText(dms(lon, "E", "W"), x, MY + H + 30);
    }
    const lat0 = latAt(H), lat1 = latAt(0);
    for (let lat = Math.ceil(lat0 / step) * step; lat < lat1; lat += step) {
      // posisi y untuk lintang (Mercator, cukup akurat untuk rentang kecil: interpolasi)
      const y = MY + H - ((lat - lat0) / (lat1 - lat0)) * H;
      g.beginPath(); g.moveTo(MX - 8, y); g.lineTo(MX + 10, y); g.moveTo(MX + W - 10, y); g.lineTo(MX + W + 8, y); g.stroke();
      for (const [x, rot] of [[MX - 16, -Math.PI / 2], [MX + W + 16, Math.PI / 2]]) {
        g.save(); g.translate(x, y); g.rotate(rot); g.textAlign = "center"; g.fillText(dms(lat, "N", "S"), 0, rot < 0 ? 0 : 0); g.restore();
      }
    }

    // Kolom informasi
    const SX = MX + W + 40, sx = SX + 14, sw = SW - 28;
    let y = MY - 8;
    const box = (h) => { g.strokeStyle = "#111"; g.lineWidth = 1.5; g.strokeRect(SX, y, SW, h); const top = y; y += h + 8; return top; };
    const text = (str, x, yy, font, align = "center") => { g.font = font; g.fillStyle = "#111"; g.textAlign = align; g.textBaseline = "middle"; g.fillText(str, x, yy); g.textBaseline = "alphabetic"; };
    const bottom = MY + H + 8;

    // 4-5: logo dan judul peta
    const logo = await loadImg(opts.logo);
    g.font = "bold 24px sans-serif";
    const titleLines = wrap(g, ("PETA " + (opts.title || "")).toUpperCase(), sw);
    g.font = "18px sans-serif";
    const subLines = opts.subtitle ? wrap(g, opts.subtitle, sw) : [];
    const hHead = (logo ? 108 : 0) + titleLines.length * 30 + subLines.length * 23 + 22;
    let t = box(hHead) + 10;
    if (logo) { const s = 92 / Math.max(logo.width, logo.height); g.drawImage(logo, SX + SW / 2 - (logo.width * s) / 2, t, logo.width * s, logo.height * s); t += 104; }
    titleLines.forEach((l) => { text(l, SX + SW / 2, t + 12, "bold 24px sans-serif"); t += 30; });
    subLines.forEach((l) => { text(l, SX + SW / 2, t + 10, "18px sans-serif"); t += 23; });

    // 7-10: keterangan ukuran, skala, arah utara, proyeksi
    const scaleN = (() => { const n = (mpp * FW) / 0.14; const p = 10 ** Math.floor(Math.log10(n)); return Math.round(n / (p / 2)) * (p / 2); })();
    const meters = niceScale(mpp * 200), barPx = meters / mpp;
    t = box(196);
    if (opts.stat) text(opts.stat, SX + SW / 2, t + 20, "18px sans-serif");
    text("Skala 1 : " + scaleN.toLocaleString("id-ID"), SX + SW / 2 - 50, t + 52, "bold 19px sans-serif");
    const bx = SX + SW / 2 - 50 - barPx / 2, by = t + 74;
    g.fillStyle = "#111"; g.fillRect(bx, by, barPx, 9); g.fillStyle = "#fff"; g.fillRect(bx + barPx / 4 + 1, by + 2, barPx / 4 - 2, 5); g.fillRect(bx + (barPx * 3) / 4 + 1, by + 2, barPx / 4 - 2, 5);
    g.font = "15px sans-serif"; g.fillStyle = "#111"; g.textAlign = "center";
    g.fillText("0", bx, by + 26); g.fillText(meters >= 1000 ? meters / 1000 + " km" : meters + " m", bx + barPx, by + 26);
    // panah utara
    const nx = SX + SW - 70, ny = t + 30;
    g.beginPath(); g.moveTo(nx, ny); g.lineTo(nx - 18, ny + 58); g.lineTo(nx, ny + 46); g.closePath(); g.fillStyle = "#111"; g.fill();
    g.beginPath(); g.moveTo(nx, ny); g.lineTo(nx + 18, ny + 58); g.lineTo(nx, ny + 46); g.closePath(); g.fillStyle = "#fff"; g.fill(); g.strokeStyle = "#111"; g.lineWidth = 1.5; g.stroke();
    text("U", nx, ny + 76, "bold 20px sans-serif");
    text("Proyeksi : Geografis", SX + SW / 2, t + 136, "16px sans-serif");
    text("Datum : WGS 1984", SX + SW / 2, t + 158, "16px sans-serif");
    text("Koordinat : Derajat, menit, detik", SX + SW / 2, t + 180, "16px sans-serif");

    // 16 dan 12-14 diukur dulu supaya keterangan (11) memakai sisa ruang
    g.font = "15px sans-serif";
    const srcLines = wrap(g, (opts.sources || "").split("\n").filter((l) => c.tilesOk || !/^Peta dasar/.test(l)).join("\n"), sw);
    const noteLines = opts.note ? wrap(g, opts.note, sw) : [];
    const hInst = 62, hInset = 210, hSrc = 34 + srcLines.length * 19, hNote = noteLines.length ? 34 + noteLines.length * 19 : 0;
    const zl = layerLegend.filter((l) => l.zona).sort((a, b) => a.label.localeCompare(b.label));
    const legend = (opts.legend || []).concat(zl, layerLegend.filter((l) => !l.zona));
    const hLeg = bottom - y - (hSrc + 8) - (hNote ? hNote + 8 : 0) - (hInset + 8) - hInst;
    // 11: keterangan
    t = box(hLeg);
    text("KETERANGAN", SX + SW / 2, t + 20, "bold 18px sans-serif");
    const rowH = Math.max(20, Math.min(27, (hLeg - 44) / Math.max(1, legend.length)));
    g.font = `${Math.min(17, rowH - 4)}px sans-serif`;
    legend.forEach((l, i) => {
      const yy = t + 46 + i * rowH; if (yy > t + hLeg - 8) return;
      if (l.type === "line") { g.fillStyle = l.color; if (l.dash) { g.fillRect(sx, yy - 2, 10, 4); g.fillRect(sx + 16, yy - 2, 10, 4); } else g.fillRect(sx, yy - 3, 26, 5); }
      else if (l.type === "area") { g.fillStyle = l.color; g.fillRect(sx, yy - 8, 26, 16); g.strokeStyle = "#555"; g.lineWidth = 1; g.strokeRect(sx, yy - 8, 26, 16); }
      else { g.beginPath(); g.arc(sx + 13, yy, 7, 0, Math.PI * 2); g.fillStyle = l.color; g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke(); }
      g.fillStyle = "#111"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(l.label.length > 40 ? l.label.slice(0, 39) + "…" : l.label, sx + 36, yy); g.textBaseline = "alphabetic";
    });
    // 12: dasar dan sumber peta
    t = box(hSrc);
    text("Sumber Data :", sx, t + 16, "bold 15px sans-serif", "left");
    srcLines.forEach((l, i) => text(l, sx, t + 36 + i * 19, "15px sans-serif", "left"));
    // 13: catatan
    if (hNote) { t = box(hNote); text("Catatan :", sx, t + 16, "bold 15px sans-serif", "left"); noteLines.forEach((l, i) => text(l, sx, t + 36 + i * 19, "15px sans-serif", "left")); }
    // 14: peta situasi
    t = box(hInset);
    text("PETA SITUASI", SX + SW / 2, t + 16, "bold 15px sans-serif");
    drawInset(g, opts.layers || [], SX + 10, t + 30, SW - 20, hInset - 40, [lonAt(0), latAt(H), lonAt(W), latAt(0)]);
    // 16: instansi dan tahun
    t = box(bottom - y);
    text((opts.instansi || "").toUpperCase(), SX + SW / 2, t + 20, "bold 17px sans-serif");
    text("Tahun " + (opts.tahun || new Date().getFullYear()), SX + SW / 2, t + 42, "16px sans-serif");

    return { dataUrl: out.toDataURL("image/jpeg", 0.9), width: FW, height: FH, tilesOk: c.tilesOk };
  }

  // Peta situasi: batas kawasan dan zonasi sederhana, kotak merah = cakupan peta utama
  function drawInset(g, layers, x0, y0, w, h, view) {
    const base = layers.filter((l) => l.role === "batas" || l.role === "zonasi");
    let b = [Infinity, Infinity, -Infinity, -Infinity];
    for (const l of base) for (const f of l.features) if (f._bbox) b = [Math.min(b[0], f._bbox[0]), Math.min(b[1], f._bbox[1]), Math.max(b[2], f._bbox[2]), Math.max(b[3], f._bbox[3])];
    b = [Math.min(b[0], view[0]), Math.min(b[1], view[1]), Math.max(b[2], view[2]), Math.max(b[3], view[3])];
    const sc = Math.min(w / (b[2] - b[0]), h / (b[3] - b[1])) * 0.92;
    const cx = x0 + w / 2, cy = y0 + h / 2, mx = (b[0] + b[2]) / 2, my = (b[1] + b[3]) / 2;
    const P = (c) => [cx + (c[0] - mx) * sc, cy - (c[1] - my) * sc];
    g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    g.fillStyle = "#e3f2fd"; g.fillRect(x0, y0, w, h);
    for (const l of base.sort((a) => (a.role === "zonasi" ? -1 : 1))) for (const f of l.features) {
      const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [];
      for (const rings of polys) {
        g.beginPath(); rings.forEach((r) => r.forEach((c, i) => { const [x, y] = P(c); i ? g.lineTo(x, y) : g.moveTo(x, y); }));
        if (l.role === "zonasi") { g.fillStyle = zonaColor(String(f.properties?.[l.field] ?? "")); g.fill("evenodd"); }
        else { g.strokeStyle = "#b71c1c"; g.lineWidth = 1.5; g.stroke(); }
      }
    }
    const [ax, ay] = P([view[0], view[3]]), [bx, by] = P([view[2], view[1]]);
    g.strokeStyle = "#d00000"; g.lineWidth = 3; g.strokeRect(ax, ay, Math.max(4, bx - ax), Math.max(4, by - ay));
    g.restore();
  }

  window.SRGMap = { render, BASEMAPS };
})();
