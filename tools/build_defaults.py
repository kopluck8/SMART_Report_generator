"""Membuat js/defaults.js (logo, lapisan peta, daftar pegawai, dan DIPA bawaan) dari folder img/ dan data/.
Pakai: python3 tools/build_defaults.py  (dijalankan dari folder utama aplikasi)"""
import json, base64, os
import openpyxl
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
    if not os.path.exists(path):
        continue  # mis. jalur patroli tidak disertakan di repository publik
    fc = json.load(open(path))
    feats = [{"type": "Feature", "properties": {k: f["properties"].get(k) for k in keep},
              "geometry": {"type": f["geometry"]["type"], "coordinates": rnd(f["geometry"]["coordinates"])}}
             for f in fc["features"] if f.get("geometry")]
    out.append({"name": name, "role": role, "field": field, "fields": keep, "builtin": True, "features": feats})
# Daftar pegawai: urutan baris = urutan kepangkatan.
# Bila data/pegawai.xlsx tidak ada (repository publik), daftar diimpor lewat Profil Balai.
def read_pegawai(path):
    if not os.path.exists(path):
        return []
    rows = list(openpyxl.load_workbook(path).worksheets[0].iter_rows(values_only=True))
    head = [str(h or "").lower() for h in rows[0]]
    col = lambda key: next(i for i, h in enumerate(head) if key in h)
    cN, cNip, cJab = col("nama"), col("nip"), col("jabatan")
    cPk = next((i for i, h in enumerate(head) if "pangkat" in h or "gol" in h), None)
    return [{"nama": str(r[cN]).strip(), "nip": str(r[cNip] or "").replace(" ", ""), "jabatan": str(r[cJab] or "").strip(),
             "pangkat": str(r[cPk] or "").strip() if cPk is not None else ""} for r in rows[1:] if r[cN]]
pegawai = read_pegawai("data/pegawai.xlsx")
dipa = json.load(open("data/dipa.json"))
logo = "data:image/png;base64," + base64.b64encode(open("img/logo-tntambora.png", "rb").read()).decode()
with open("js/defaults.js", "w") as f:
    f.write("/* Dibuat oleh tools/build_defaults.py. Logo dan lapisan peta bawaan Balai TN Tambora. */\n")
    f.write("window.SRG_DEFAULT_LOGO = " + json.dumps(logo) + ";\n")
    f.write("window.SRG_DEFAULT_PEGAWAI = " + json.dumps(pegawai, ensure_ascii=False) + ";\n")
    f.write("window.SRG_DIPA = " + json.dumps(dipa, ensure_ascii=False) + ";\n")
    f.write("window.SRG_DEFAULT_LAYERS = " + json.dumps(out, separators=(",", ":")) + ";\n")
print(os.path.getsize("js/defaults.js") // 1024, "KB")
