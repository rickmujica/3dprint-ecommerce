// Genera un modelo multicolor de ejemplo (diseño propio): un pingüino con bufanda en 4 partes,
// una por color, para probar las zonas de color de punta a punta.
//
//   public/demo/pinguino-bufanda.glb   → catálogo demo (metros, Y arriba)
//   <out>/pinguino-bufanda.glb         → para subir en /admin/modelos/nuevo (milímetros, Y arriba)
//   <out>/pinguino-bufanda-<parte>.stl → una STL por color para el slicer (mm, Z arriba): se importan
//                                        juntas como un objeto de varias partes y se asigna un filamento a cada una.
//
// Uso: node scripts/make-multicolor-demo.mjs [--out out/pinguino-bufanda]
import { mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { partsToGlb } from "./lib/glb.mjs";

const { values: opts } = parseArgs({ options: { out: { type: "string", default: "out/pinguino-bufanda" } } });

/** Esfera escalada y ubicada (en mm). */
function blob(sx, sy, sz, x, y, z, seg = 48) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  return g;
}

/** Une geometrías conservando solo posiciones (las normales se recalculan). */
function merge(...geos) {
  const clean = geos.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (k !== "position") n.deleteAttribute(k);
    return n;
  });
  const m = mergeVertices(mergeGeometries(clean), 1e-4);
  m.computeVertexNormals();
  return m;
}

// Medidas en mm, Y hacia arriba, apoyado en y = 0. Alto total ≈ 72 mm.
const eyeY = 58, eyeZ = 12.5, eyeX = 5.5;
const parts = [
  {
    name: "Cuerpo",
    color: "#111111",
    geometry: merge(
      blob(21, 27, 19, 0, 27, 0), // cuerpo
      blob(14.5, 14, 14, 0, 55, 0), // cabeza
      blob(4, 12, 4, -20, 30, -2), // aleta izquierda
      blob(4, 12, 4, 20, 30, -2), // aleta derecha
      blob(1.4, 1.6, 1, -eyeX, eyeY, eyeZ + 1.6, 16), // pupilas
      blob(1.4, 1.6, 1, eyeX, eyeY, eyeZ + 1.6, 16),
    ),
  },
  {
    name: "Panza y ojos",
    color: "#f5f5f5",
    geometry: merge(
      blob(15, 21, 9, 0, 25, 11), // panza
      blob(3, 3.4, 2, -eyeX, eyeY, eyeZ, 24), // ojos
      blob(3, 3.4, 2, eyeX, eyeY, eyeZ, 24),
    ),
  },
  {
    name: "Pico y patas",
    color: "#f97316",
    geometry: merge(
      (() => {
        const g = new THREE.ConeGeometry(3.2, 8, 24);
        g.rotateX(Math.PI / 2); // punta hacia adelante (+Z)
        g.translate(0, 52.5, 16);
        return g;
      })(),
      blob(7, 2.2, 9, -8, 2.2, 9), // patas
      blob(7, 2.2, 9, 8, 2.2, 9),
    ),
  },
  {
    name: "Bufanda",
    color: "#dc2626",
    geometry: merge(
      (() => {
        const g = new THREE.TorusGeometry(15.5, 3.4, 20, 64);
        g.rotateX(Math.PI / 2);
        g.translate(0, 43, 0);
        return g;
      })(),
      (() => {
        const g = new THREE.BoxGeometry(6, 16, 3, 1, 4, 1); // punta que cuelga
        g.rotateZ(0.25);
        g.translate(10, 35, 14.5);
        return g;
      })(),
    ),
  },
];

// Apoya el conjunto en y = 0 y lo centra en x/z.
const box = new THREE.Box3();
for (const p of parts) box.union(new THREE.Box3().setFromBufferAttribute(p.geometry.attributes.position));
const shift = new THREE.Vector3(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
for (const p of parts) p.geometry.translate(shift.x, shift.y, shift.z);
const size = box.getSize(new THREE.Vector3());
console.log(`Medidas: ${size.x.toFixed(1)} × ${size.z.toFixed(1)} × ${size.y.toFixed(1)} mm (ancho × prof. × alto)`);

const generator = "3dprint-ecommerce multicolor demo";
mkdirSync(opts.out, { recursive: true });
writeFileSync(`${opts.out}/pinguino-bufanda.glb`, partsToGlb(parts, { generator }));

const exporter = new STLExporter();
for (const p of parts) {
  const g = p.geometry.clone();
  g.rotateX(Math.PI / 2); // Y arriba → Z arriba
  const stl = exporter.parse(new THREE.Mesh(g), { binary: true });
  const slug = p.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
  writeFileSync(`${opts.out}/pinguino-bufanda-${slug}.stl`, Buffer.from(stl.buffer));
}
console.log(`Archivos para subir e imprimir en ${opts.out}/`);

// Versión del catálogo demo, en metros.
const demo = parts.map((p) => ({ ...p, geometry: p.geometry.clone().scale(0.001, 0.001, 0.001) }));
mkdirSync(new URL("../public/demo/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/demo/pinguino-bufanda.glb", import.meta.url), partsToGlb(demo, { generator }));
console.log("public/demo/pinguino-bufanda.glb");
