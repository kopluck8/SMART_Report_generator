"""Buat js/dictionary.js dari ekspor Data Model SMART (datamodel.xml).

Pemakaian:  python3 tools/build_dictionary.py path/ke/datamodel.xml > js/dictionary.js
"""
import json
import sys
import xml.etree.ElementTree as ET

root = ET.parse(sys.argv[1]).getroot()
ns = root.tag.split("}")[0] + "}" if root.tag.startswith("{") else ""


def name(el, langs=("in", "id", "en")):
    names = el.findall(ns + "names")
    for lang in langs:
        for n in names:
            if n.get("language_code") == lang:
                return n.get("value")
    return names[0].get("value") if names else None


cats, attrs, items = {}, {}, {}
for a in root.find(ns + "attributes"):
    akey = a.get("key")
    attrs[akey] = name(a)

    def walk(el, path):
        for c in el:
            if c.get("key") is None or c.tag not in (ns + "tree", ns + "children", ns + "values"):
                continue
            p = path + [c.get("key")]
            full = ".".join(p) + ("" if c.tag == ns + "values" else ".")
            label = name(c)
            if label:
                items[akey + "|" + full] = label
                items.setdefault(full, label)
            walk(c, p)

    walk(a, [])


def walk_cat(el, path):
    for c in el.findall(ns + "category"):
        p = path + [c.get("key")]
        cats[".".join(p) + "."] = name(c)
        walk_cat(c, p)


walk_cat(root.find(ns + "categories"), [])

print("/* Dibuat otomatis oleh tools/build_dictionary.py dari Data Model SMART Balai TN Tambora. */")
print("window.SRG_DICTIONARY = " + json.dumps({"categories": cats, "attributes": attrs, "items": items}, ensure_ascii=False, separators=(",", ":")) + ";")
