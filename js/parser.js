/*
 * Pembaca ekspor patroli SMART (XML skema patrol 1.x) dan Data Model SMART.
 * Semua proses berjalan di browser; tidak ada data yang dikirim ke server.
 */
(function () {
  "use strict";

  const kids = (el, name) => (el ? [...el.children].filter((c) => c.localName === name) : []);
  const kid = (el, name) => kids(el, name)[0];
  const attr = (el, name) => (el && el.hasAttribute(name) ? el.getAttribute(name) : "");
  // <ns2:team value="..."/> atau <ns2:objective>teks</ns2:objective>
  const valueOf = (el) => (el ? attr(el, "value") || el.textContent.trim() : "");

  /* ---------- Geometri: WKB / EWKB dalam hex ---------- */
  function parseWKBHex(hex) {
    if (!hex) return [];
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    const dv = new DataView(bytes.buffer);
    let o = 0;
    const lines = [];

    function readGeom() {
      const little = dv.getUint8(o) === 1;
      o += 1;
      let type = dv.getUint32(o, little);
      o += 4;
      let dims = 2;
      if (type & 0x80000000) dims++; // EWKB Z
      if (type & 0x40000000) dims++; // EWKB M
      if (type & 0x20000000) o += 4; // SRID
      type &= 0x0fffffff;
      if (type > 1000) {
        // ISO WKB: 1000 = Z, 2000 = M, 3000 = ZM
        const t = Math.floor(type / 1000);
        dims = 2 + (t === 3 ? 2 : 1);
        type %= 1000;
      }
      const pt = () => {
        const p = [];
        for (let d = 0; d < dims; d++) { p.push(dv.getFloat64(o, little)); o += 8; }
        return p;
      };
      const count = () => { const n = dv.getUint32(o, little); o += 4; return n; };
      if (type === 1) { lines.push([pt()]); }
      else if (type === 2) { const n = count(); const l = []; for (let i = 0; i < n; i++) l.push(pt()); lines.push(l); }
      else if (type === 4 || type === 5 || type === 7) { const n = count(); for (let i = 0; i < n; i++) readGeom(); }
      else throw new Error("Tipe geometri belum didukung: " + type);
    }
    readGeom();
    // Format titik: [lon, lat, waktu(epoch ms)?]
    return lines;
  }

  /* ---------- Patroli ---------- */
  function parseAttribute(a) {
    const key = attr(a, "attributeKey");
    const values = [];
    for (const c of a.children) {
      const t = c.textContent;
      if (c.localName === "itemKey") values.push({ kind: "item", value: t.trim() });
      else if (c.localName === "dValue") values.push({ kind: "number", value: parseFloat(t) });
      else if (c.localName === "bValue") values.push({ kind: "bool", value: t.trim() === "true" });
      else if (c.localName === "sValue") values.push({ kind: "text", value: t.trim() });
      else if (t.trim()) values.push({ kind: "text", value: t.trim() });
    }
    return { key, values };
  }

  function parseObservation(ob) {
    return {
      category: attr(ob, "categoryKey"),
      attributes: kids(ob, "attributes").map(parseAttribute),
      photos: kids(ob, "attachments").map((a) => attr(a, "filename")).filter(Boolean)
    };
  }

  function parsePatrolXML(text) {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.getElementsByTagName("parsererror").length) throw new Error("File XML tidak bisa dibaca.");
    const root = doc.documentElement;
    if (root.localName !== "patrol") throw new Error("File ini bukan ekspor patroli SMART (elemen <patrol> tidak ditemukan).");

    const patrol = {
      id: attr(root, "id"),
      type: attr(root, "patrolType"),
      startDate: attr(root, "startDate"),
      endDate: attr(root, "endDate"),
      armed: attr(root, "isArmed") === "true",
      objective: valueOf(kid(root, "objective")),
      comment: valueOf(kid(root, "comment")),
      team: valueOf(kid(root, "team")),
      station: valueOf(kid(root, "station")),
      mandate: valueOf(kid(root, "mandate")),
      // atribut patroli tambahan (mis. sumber anggaran, nomor SPT)
      attributes: kids(root, "attributes").map((a) => {
        const v = [...a.attributes].find((x) => x.name !== "key");
        return { key: attr(a, "key"), kind: v && /item|list/i.test(v.name) ? "item" : "text", value: v ? v.value : a.textContent.trim() };
      }),
      legs: []
    };

    let wpSeq = 0;
    for (const lg of kids(root, "legs")) {
      const leg = {
        id: attr(lg, "id"),
        startDate: attr(lg, "startDate"),
        endDate: attr(lg, "endDate"),
        transport: valueOf(kid(lg, "transportType")),
        mandate: valueOf(kid(lg, "mandate")),
        members: kids(lg, "members").map((m) => ({
          givenName: attr(m, "givenName"),
          familyName: attr(m, "familyName"),
          employeeId: attr(m, "employeeId"),
          isLeader: attr(m, "isLeader") === "true",
          isPilot: attr(m, "isPilot") === "true"
        })),
        days: []
      };
      for (const d of kids(lg, "days")) {
        const day = {
          date: attr(d, "date"),
          startTime: attr(d, "startTime"),
          endTime: attr(d, "endTime"),
          restMinutes: parseFloat(attr(d, "restMinutes")) || 0,
          waypoints: [],
          tracks: []
        };
        for (const w of kids(d, "waypoints")) {
          const obs = [];
          for (const g of kids(w, "groups")) for (const ob of kids(g, "observations")) obs.push(parseObservation(ob));
          for (const ob of kids(w, "observations")) obs.push(parseObservation(ob));
          day.waypoints.push({
            seq: ++wpSeq,
            id: attr(w, "id"),
            x: parseFloat(attr(w, "x")),
            y: parseFloat(attr(w, "y")),
            date: day.date,
            time: attr(w, "time"),
            comment: valueOf(kid(w, "comment")),
            photos: kids(w, "attachments").map((a) => attr(a, "filename")).filter(Boolean),
            observations: obs
          });
        }
        for (const t of kids(d, "track")) {
          try { day.tracks.push(...parseWKBHex(attr(t, "geom"))); } catch (e) { console.warn(e); }
        }
        leg.days.push(day);
      }
      patrol.legs.push(leg);
    }
    // di SMART 7 mandat disimpan per leg
    if (!patrol.mandate) patrol.mandate = [...new Set(patrol.legs.map((l) => l.mandate).filter(Boolean))].join(", ");
    return patrol;
  }

  /* ---------- Kamus (Data Model / CSV) ---------- */
  function emptyDict() { return { categories: {}, attributes: {}, items: {} }; }

  function pickName(el, langs) {
    const names = kids(el, "names").concat(kids(el, "name"));
    if (!names.length) return "";
    const code = (n) => (attr(n, "language_code") || attr(n, "languageCode") || attr(n, "lang") || "").toLowerCase();
    for (const l of langs) {
      const n = names.find((x) => code(x) === l);
      if (n) return valueOf(n);
    }
    return valueOf(names[0]);
  }

  // Ekspor Data Model SMART Desktop (Conservation Area > Data Model > Export).
  // Pilihan daftar/pohon disimpan sebagai "atribut|key" dan juga key saja.
  function parseDataModelXML(text, langs = ["in", "id", "en"]) {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.getElementsByTagName("parsererror").length) throw new Error("File Data Model tidak bisa dibaca.");
    const dict = emptyDict();
    let n = 0;
    const root = doc.documentElement;
    for (const a of kids(kid(root, "attributes"), "attribute")) {
      const akey = attr(a, "key");
      const al = pickName(a, langs);
      if (al) { dict.attributes[akey] = al; n++; }
      const walk = (el, path) => {
        for (const c of el.children) {
          if (!["tree", "children", "values"].includes(c.localName) || !attr(c, "key")) continue;
          const p = path.concat(attr(c, "key"));
          const full = p.join(".") + (c.localName === "values" ? "" : ".");
          const label = pickName(c, langs);
          if (label) { dict.items[akey + "|" + full] = label; if (!dict.items[full]) dict.items[full] = label; n++; }
          walk(c, p);
        }
      };
      walk(a, []);
    }
    const walkCat = (el, path) => {
      for (const c of kids(el, "category")) {
        const p = path.concat(attr(c, "key"));
        const label = pickName(c, langs);
        if (label) { dict.categories[p.join(".") + "."] = label; n++; }
        walkCat(c, p);
      }
    };
    walkCat(kid(root, "categories"), []);
    if (!n) throw new Error("Tidak ada key/label yang ditemukan di file Data Model.");
    return dict;
  }

  // CSV sederhana: key,label (pemisah koma atau titik koma)
  function parseDictionaryCSV(text) {
    const dict = emptyDict();
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const m = line.match(/^"?([^",;]+)"?\s*[,;]\s*"?(.*?)"?$/);
      if (!m || m[1].toLowerCase() === "key") continue;
      dict.items[m[1]] = m[2];
      dict.categories[m[1]] = m[2];
      dict.attributes[m[1]] = m[2];
    }
    return dict;
  }

  /* ---------- Hitungan & koordinat ---------- */
  function haversine(a, b) {
    const R = 6371008.8, rad = Math.PI / 180;
    const dLat = (b[1] - a[1]) * rad, dLon = (b[0] - a[0]) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function lineLength(line) {
    let m = 0;
    for (let i = 1; i < line.length; i++) m += haversine(line[i - 1], line[i]);
    return m;
  }

  // WGS84 -> UTM (zona otomatis)
  function toUTM(lon, lat) {
    const a = 6378137, f = 1 / 298.257223563, k0 = 0.9996;
    const e2 = f * (2 - f), ep2 = e2 / (1 - e2);
    const zone = Math.floor((lon + 180) / 6) + 1;
    const lon0 = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
    const phi = lat * Math.PI / 180, lam = lon * Math.PI / 180;
    const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
    const T = Math.tan(phi) ** 2, C = ep2 * Math.cos(phi) ** 2, A = Math.cos(phi) * (lam - lon0);
    const M = a * ((1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * phi
      - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * phi)
      + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * phi)
      - (35 * e2 ** 3 / 3072) * Math.sin(6 * phi));
    const x = k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5 / 120) + 500000;
    let y = k0 * (M + N * Math.tan(phi) * (A ** 2 / 2 + (5 - T + 9 * C + 4 * C ** 2) * A ** 4 / 24
      + (61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6 / 720));
    if (lat < 0) y += 10000000;
    return { zone: zone + (lat < 0 ? "S" : "N"), x, y };
  }

  function toDMS(v, pos, neg) {
    const h = v < 0 ? neg : pos;
    v = Math.abs(v);
    const d = Math.floor(v), mF = (v - d) * 60, m = Math.floor(mF), s = (mF - m) * 60;
    return `${d}°${String(m).padStart(2, "0")}'${s.toFixed(1).padStart(4, "0")}" ${h}`;
  }

  window.SMART = { parsePatrolXML, parseDataModelXML, parseDictionaryCSV, parseWKBHex, haversine, lineLength, toUTM, toDMS, emptyDict };
})();
