"""Convierte un .3mf/.stl a GLB (visor web, metros, Y arriba) + STL (mm, Z arriba) + JSON con medidas y volumen.
Uso: python3 -I convert.py <archivo> <salida_sin_ext> [--items 2,4] [--plate 1] [--max-tris 150000] [--color #hex]
"""
import argparse
import json
import sys
import zipfile
from pathlib import Path

import numpy as np
import trimesh
from lxml import etree

sys.path.insert(0, str(Path(__file__).parent))
import read3mf  # noqa: E402


def subtypes(fn):
    out = {}
    try:
        cfg = etree.fromstring(zipfile.ZipFile(fn).read("Metadata/model_settings.config"))
    except KeyError:
        return out
    for o in cfg.findall("object"):
        for p in o.findall("part"):
            out[(o.get("id"), p.get("id"))] = p.get("subtype") or "normal_part"
    return out


def load_items(fn, plate=None, items=None):
    if fn.lower().endswith(".stl"):
        m = trimesh.load(fn, force="mesh")
        return [[m]]
    meta, parts, names, plates, ex = read3mf.read(fn)
    st = subtypes(fn)
    order = []
    groups = {}
    for p in parts:
        if st.get((p["top"], p["objid"]), "normal_part") != "normal_part":
            continue
        groups.setdefault(p["top"], []).append(trimesh.Trimesh(p["V"], p["F"], process=False))
        if p["top"] not in order:
            order.append(p["top"])
    if items:
        order = [i for i in order if i in items]
    elif plate:
        order = [i for i in order if i in plates.get(plate, [])]
    # Copias idénticas (misma pieza repetida en la placa) se muestran una sola vez.
    seen, uniq = set(), []
    for top in order:
        ms = groups[top]
        sig = tuple(sorted((len(m.faces), *np.round(m.extents, 0)) for m in ms))
        if sig in seen:
            continue
        seen.add(sig)
        uniq.append(ms)
    return uniq


def layout(groups, gap=6.0, max_row=220.0):
    """Coloca cada pieza (grupo) en filas, apoyadas en z=0, conservando su posición relativa interna."""
    placed = []
    x = y = row_h = 0.0
    for ms in groups:
        mesh = trimesh.util.concatenate(ms)
        lo, hi = mesh.bounds
        w, d = hi[0] - lo[0], hi[1] - lo[1]
        if x > 0 and x + w > max_row:
            x = 0.0
            y -= row_h + gap
            row_h = 0.0
        mesh.apply_translation([x - lo[0], y - hi[1], -lo[2]])
        placed.append(mesh)
        x += w + gap
        row_h = max(row_h, d)
    return placed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--items")
    ap.add_argument("--plate")
    ap.add_argument("--max-tris", type=int, default=150_000)
    ap.add_argument("--color", default="#e8a0b4")
    a = ap.parse_args()

    groups = load_items(a.src, a.plate, a.items.split(",") if a.items else None)
    placed = layout(groups)
    full = trimesh.util.concatenate(placed)
    volume_mm3 = float(sum(abs(m.volume) for m in placed))
    watertight = all(m.is_watertight for m in placed)
    lo, hi = full.bounds
    full.apply_translation([-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2]])
    full.export(a.out + ".stl")

    web = full.copy()
    web.merge_vertices()
    tris_in = len(web.faces)
    if tris_in > a.max_tris:
        import fast_simplification

        v, f = fast_simplification.simplify(web.vertices.astype(np.float32), web.faces.astype(np.int32), 1 - a.max_tris / tris_in)
        web = trimesh.Trimesh(v, f, process=False)
    # Z arriba (mm) -> Y arriba (m), como prepare-model.ts
    rot = np.array([[1, 0, 0, 0], [0, 0, 1, 0], [0, -1, 0, 0], [0, 0, 0, 1]], dtype=float)
    web.apply_transform(rot)
    web.apply_scale(0.001)
    rgb = [int(a.color[i : i + 2], 16) for i in (1, 3, 5)]
    web.visual = trimesh.visual.TextureVisuals(
        material=trimesh.visual.material.PBRMaterial(name="Pieza", baseColorFactor=[*rgb, 255], metallicFactor=0.0, roughnessFactor=0.55)
    )
    scene = trimesh.Scene()
    scene.add_geometry(web, node_name="pieza", geom_name="pieza")
    glb = trimesh.exchange.gltf.export_glb(scene, include_normals=False)
    Path(a.out + ".glb").write_bytes(glb)

    size = (hi - lo).tolist()
    info = {
        "size_mm": [round(s, 1) for s in size],
        "volume_cm3": round(volume_mm3 / 1000, 2),
        "pieces": len(placed),
        "tris_full": int(len(full.faces)),
        "tris_web": int(len(web.faces)),
        "glb_kb": round(len(glb) / 1024, 1),
        "watertight": watertight,
    }
    Path(a.out + ".json").write_text(json.dumps(info))
    print(json.dumps(info))


if __name__ == "__main__":
    main()
