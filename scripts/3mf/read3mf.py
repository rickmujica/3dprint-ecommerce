"""Lee un .3mf (incluido el formato de Bambu/Orca con objetos en archivos aparte) y devuelve
las mallas de cada item de la placa con su transformación aplicada, en mm."""
import re
import sys
import zipfile
import json
import numpy as np
from lxml import etree

NS = "{http://schemas.microsoft.com/3dmanufacturing/core/2015/02}"
PNS = "{http://schemas.microsoft.com/3dmanufacturing/production/2015/06}"


def parse_transform(s):
    if not s:
        return np.eye(4)
    v = [float(x) for x in s.split()]
    m = np.eye(4)
    # 3MF: m00 m01 m02 m10 m11 m12 m20 m21 m22 m30 m31 m32 (fila = vector, se multiplica por la derecha)
    m[:3, :3] = np.array(v[:9]).reshape(3, 3).T
    m[:3, 3] = v[9:12]
    return m


VRE = re.compile(rb'<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"')
TRE = re.compile(rb'<triangle\s+v1="(\d+)"\s+v2="(\d+)"\s+v3="(\d+)"([^>]*)>')
PRE = re.compile(rb'paint_color="([^"]*)"')
ORE = re.compile(rb'<object\s[^>]*?\bid="(\d+)"')
CRE = re.compile(rb'<component\s([^>]*)>')


def _attr(s, name):
    m = re.search(rb'(?:^|\s)' + name + rb'="([^"]*)"', s)
    return m.group(1).decode() if m else None


def parse_model(zf, path, cache):
    """Devuelve {id: ('mesh', V, F, paint) | ('comp', [(path, objid, M)])}"""
    if path in cache:
        return cache[path]
    objs = {}
    data = zf.read(path.lstrip("/"))
    starts = [(m.start(), m.group(1).decode()) for m in ORE.finditer(data)]
    for i, (pos, oid) in enumerate(starts):
        endpos = data.find(b"</object>", pos)
        block = data[pos:endpos]
        if b"<mesh" in block:
            v = np.array(VRE.findall(block), dtype=np.float64)
            tr = TRE.findall(block)
            F = np.array([t[:3] for t in tr], dtype=np.int64)
            paint = []
            for t in tr:
                m = PRE.search(t[3]) if t[3] else None
                paint.append(m.group(1).decode() if m else "")
            objs[oid] = ("mesh", v, F, paint)
        else:
            comps = []
            for c in CRE.finditer(block):
                a = c.group(1)
                comps.append((_attr(a, rb"p:path") or path, _attr(a, rb"objectid"), parse_transform(_attr(a, rb"transform"))))
            objs[oid] = ("comp", comps)
    cache[path] = objs
    return objs


def flatten(zf, path, objid, M, cache, out, top):
    objs = parse_model(zf, path, cache)
    o = objs[objid]
    if o[0] == "mesh":
        V = np.c_[o[1], np.ones(len(o[1]))] @ M.T
        out.append({"top": top, "objid": objid, "path": path, "V": V[:, :3], "F": o[2], "paint": o[3]})
    else:
        for i, (p, oid, T) in enumerate(o[1]):
            flatten(zf, p, oid, M @ T, cache, out, top)


def read(fn):
    zf = zipfile.ZipFile(fn)
    cache = {}
    root = etree.fromstring(zf.read("3D/3dmodel.model"))
    meta = {m.get("name"): (m.text or "") for m in root.findall(NS + "metadata")}
    items = []
    for it in root.find(NS + "build").findall(NS + "item"):
        items.append((it.get("objectid"), parse_transform(it.get("transform")), it.get("printable")))
    parts = []
    for oid, M, printable in items:
        flatten(zf, "/3D/3dmodel.model", oid, M, cache, parts, oid)
    names = {}
    plates = {}
    extruders = {}
    try:
        cfg = etree.fromstring(zf.read("Metadata/model_settings.config"))
        for o in cfg.findall("object"):
            oid = o.get("id")
            for md in o.findall("metadata"):
                if md.get("key") == "name":
                    names[oid] = md.get("value")
                if md.get("key") == "extruder":
                    extruders[oid] = md.get("value")
            for p in o.findall("part"):
                pid = p.get("id")
                for md in p.findall("metadata"):
                    if md.get("key") == "name":
                        names[(oid, pid)] = md.get("value")
                    if md.get("key") == "extruder":
                        extruders[(oid, pid)] = md.get("value")
        for pl in cfg.findall("plate"):
            pid = None
            for md in pl.findall("metadata"):
                if md.get("key") == "plater_id":
                    pid = md.get("value")
            for inst in pl.findall("model_instance"):
                for md in inst.findall("metadata"):
                    if md.get("key") == "object_id":
                        plates.setdefault(pid, []).append(md.get("value"))
    except KeyError:
        pass
    return meta, parts, names, plates, extruders


if __name__ == "__main__":
    fn = sys.argv[1]
    meta, parts, names, plates, ex = read(fn)
    print(json.dumps({"plates": plates, "names": {str(k): v for k, v in names.items()}, "extruders": {str(k): v for k, v in ex.items()}}, ensure_ascii=False))
    for p in parts:
        V = p["V"]
        npaint = sum(1 for x in p["paint"] if x)
        print(p["top"], p["objid"], p["path"].split("/")[-1], len(p["F"]), "tris", np.round(V.min(0), 1).tolist(), np.round(V.max(0) - V.min(0), 1).tolist(), "painted", npaint)
