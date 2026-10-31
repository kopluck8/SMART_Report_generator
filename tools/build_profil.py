"""Membuat js/profil.js (profil kawasan, SPTN, dan resor) dari data Satu Data Tambora.

Sumber: data/kajian_resor_2026.json dan data/batas_resor_2026.geojson, salinan dari repo
Satu Data Tambora (data/resor/kajian_2026.json dan data/resor/batas_resor_2026.geojson).
Pakai: python3 tools/build_profil.py  (dijalankan dari folder utama aplikasi)

Setelah kajian di Satu Data diperbarui, salin ulang kedua file itu ke data/ lalu jalankan skrip ini.
Aplikasi juga mencoba membaca kajian terbaru langsung dari situs Satu Data saat dibuka;
js/profil.js dipakai bila situs tidak bisa dijangkau (offline).
"""
import json, os

KAJIAN = "data/kajian_resor_2026.json"
BATAS = "data/batas_resor_2026.geojson"
RESOR_KEYS = ["id", "kode", "nama", "sptn", "luas_ha", "baru", "desa", "kantor", "akses", "potensi", "ancaman", "fokus"]


def rnd(c):
    return [round(c[0], 5), round(c[1], 5)] if isinstance(c[0], (int, float)) else [rnd(x) for x in c]


k = json.load(open(KAJIAN, encoding="utf-8"))
g = json.load(open(BATAS, encoding="utf-8"))
by_kode = {r["kode"]: r["id"] for r in k["resor"]}
out = {
    "sumber": {key: k["sumber"].get(key) for key in ("judul", "penyusun", "tempat", "tanggal")},
    "kawasan": {key: k["kawasan"][key] for key in k["kawasan"] if key not in ("sdm", "luas_kajian_ha")},
    "sptn": [{key: s[key] for key in ("id", "nama", "kabupaten", "luas_ha", "ringkas", "wisata") if key in s} for s in k["sptn"]],
    "resor": [{key: r[key] for key in RESOR_KEYS if key in r} for r in k["resor"]],
    "batas": [{"id": by_kode.get(f["properties"].get("kode")), "geometry": {"type": f["geometry"]["type"], "coordinates": rnd(f["geometry"]["coordinates"])}}
              for f in g["features"] if f.get("geometry")],
}
missing = [b for b in out["batas"] if not b["id"]]
if missing:
    raise SystemExit("Kode resor di batas_resor_2026.geojson tidak cocok dengan kajian.")
with open("js/profil.js", "w", encoding="utf-8") as f:
    f.write("/* Dibuat oleh tools/build_profil.py dari Satu Data Tambora: Kajian Wilayah Kerja Resor 2026 dan batas resor 2026. */\n")
    f.write("window.SRG_PROFIL = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
print(os.path.getsize("js/profil.js") // 1024, "KB")
