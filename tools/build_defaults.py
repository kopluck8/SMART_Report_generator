"""Membuat js/defaults.js (logo dan lapisan peta bawaan) dari folder img/ dan data/.
Pakai: python3 tools/build_defaults.py  (dijalankan dari folder utama aplikasi)"""
import json, base64, os
LAYERS = [  # (file, nama, peran, kolom label, kolom yang disimpan)
    ("data/batas_tambora.geojson", "Batas kawasan TN Tambora", "batas", "Nama", ["Nama"]),
    ("data/zonasi.geojson", "Zonasi", "zonasi", "Zonasi", ["Zonasi", "Kode_Zona"]),
    ("data/resor.geojson", "Resor", "resort", "NAME", ["NAME"]),
    ("data/jalur.geojson", "Jalur", "jalur", "Tipe", ["Name", "Tipe"]),
    ("data/grid.geojson", "Grid", "grid", "Grid_ID", ["Grid_ID"]),
]
def rnd(c):
    return [round(c[0], 5), round(c[1], 5)] if isinstance(c[0], (int, float)) else [rnd(x) for x in c]
out = []
for path, name, role, field, keep in LAYERS:
    fc = json.load(open(path))
    feats = [{"type": "Feature", "properties": {k: f["properties"].get(k) for k in keep},
              "geometry": {"type": f["geometry"]["type"], "coordinates": rnd(f["geometry"]["coordinates"])}}
             for f in fc["features"] if f.get("geometry")]
    out.append({"name": name, "role": role, "field": field, "fields": keep, "builtin": True, "features": feats})
logo = "data:image/png;base64," + base64.b64encode(open("img/logo-tntambora.png", "rb").read()).decode()
with open("js/defaults.js", "w") as f:
    f.write("/* Dibuat oleh tools/build_defaults.py. Logo dan lapisan peta bawaan Balai TN Tambora. */\n")
    f.write("window.SRG_DEFAULT_LOGO = " + json.dumps(logo) + ";\n")
    f.write("window.SRG_DEFAULT_LAYERS = " + json.dumps(out, separators=(",", ":")) + ";\n")
print(os.path.getsize("js/defaults.js") // 1024, "KB")
