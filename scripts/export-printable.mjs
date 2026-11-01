// Convierte un modelo procedural de three.js (por ejemplo, la salida de img2threejs) en archivos
// listos para el catálogo y la impresora:
//   <slug>.glb   → visor web / realidad aumentada (metros, Y arriba, apoyado en y = 0)
//   <slug>.stl   → slicer (binario, milímetros, Z arriba, apoyado en z = 0)
//   <slug>.json  → informe: medidas, triángulos, malla cerrada, volumen y gramos estimados
//
// Uso:
//   npm run export-printable -- <modelo.mjs|modelo.ts> --size-mm 120 [--axis height|max]
//     [--slug nombre] [--out dir] [--color "#a855f7"] [--allow-open]
//
// El módulo debe exportar (default o `createObjectModel`) una función que devuelva un
// THREE.Object3D o una THREE.BufferGeometry, o directamente el objeto. Las unidades del modelo
// no importan: se reescala para que la medida pedida (--size-mm) sea exacta.
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { geometryToGlb } from "./lib/glb.mjs";

const PLA_DENSITY = 1.24; // g/cm³

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    "size-mm": { type: "string" },
    axis: { type: "string", default: "height" },
    slug: { type: "string" },
    out: { type: "string", default: "out/printable" },
    color: { type: "string", default: "#a855f7" },
    "allow-open": { type: "boolean", default: false },
  },
});

const input = positionals[0];
if (!input || !opts["size-mm"]) {
  console.error("Uso: npm run export-printable -- <modelo.mjs|.ts> --size-mm <mm> [--axis height|max] [--slug s] [--out dir]");
  process.exit(2);
}
const sizeMm = Number(opts["size-mm"]);
if (!(sizeMm > 0)) throw new Error("--size-mm debe ser un número positivo");
const slug = opts.slug ?? basename(input, extname(input));

// 1. Cargar el modelo.
const mod = await import(pathToFileURL(resolve(input)).href);
let model = mod.default ?? mod.createObjectModel ?? Object.values(mod).find((v) => typeof v === "function");
if (typeof model === "function") model = await model();
if (!model) throw new Error("El módulo no exporta un modelo (default, createObjectModel o una función)");

// 2. Juntar toda la geometría en coordenadas de mundo (solo posiciones: la impresión no usa UV ni color).
const parts = [];
if (model.isBufferGeometry) {
  parts.push(model.clone());
} else {
  model.updateMatrixWorld(true);
  model.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    if (o.visible === false) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", o.geometry.attributes.position.clone());
    if (o.geometry.index) g.setIndex(o.geometry.index.clone());
    g.applyMatrix4(o.matrixWorld);
    // Una matriz con determinante negativo (escala espejada) invierte las caras: corregir el orden.
    if (o.matrixWorld.determinant() < 0) flipWinding(g);
    parts.push(g.index ? g.toNonIndexed() : g);
  });
}
if (!parts.length) throw new Error("El modelo no tiene mallas");
let geo = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
geo = mergeVertices(geo, 1e-6 * maxDim(geo));

// 3. Escalar a la medida pedida (en metros, Y arriba) y apoyar en la cama.
geo.computeBoundingBox();
const box0 = geo.boundingBox;
const size0 = box0.getSize(new THREE.Vector3());
const ref = opts.axis === "max" ? Math.max(size0.x, size0.y, size0.z) : size0.y;
geo.scale(sizeMm / 1000 / ref, sizeMm / 1000 / ref, sizeMm / 1000 / ref);
geo.computeBoundingBox();
const b = geo.boundingBox;
geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
geo.computeBoundingBox();
geo.computeVertexNormals();

// 4. Revisar la malla: cada arista tiene que estar compartida por exactamente dos triángulos.
const report = inspect(geo);
const { min, max } = geo.boundingBox;
const mm = (v) => Math.round(v * 10000) / 10;
report.slug = slug;
report.sizeMm = { x: mm(max.x - min.x), y: mm(max.z - min.z), z: mm(max.y - min.y) }; // z = alto en el slicer
// Con la malla abierta el volumen no tiene sentido. Con cuerpos superpuestos se cuenta dos veces la parte común.
report.volumeCm3 = report.watertight ? Math.round(report.volumeM3 * 1e6 * 10) / 10 : null;
report.solidGramsPla = report.watertight ? Math.round(report.volumeCm3 * PLA_DENSITY) : null;
delete report.volumeM3;

// 5. Escribir los archivos.
const outDir = resolve(opts.out);
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, `${slug}.glb`), geometryToGlb(geo, { name: slug, color: opts.color, generator: "3dprint-ecommerce export-printable" }));
writeFileSync(resolve(outDir, `${slug}.stl`), toBinaryStl(geo, slug));
writeFileSync(resolve(outDir, `${slug}.json`), JSON.stringify(report, null, 2) + "\n");

console.log(`${slug}: ${report.sizeMm.x}×${report.sizeMm.y}×${report.sizeMm.z} mm, ${report.triangles} triángulos, ${report.shells} cuerpo(s)`);
if (report.watertight) console.log(`  volumen ${report.volumeCm3} cm³ (≈ ${report.solidGramsPla} g de PLA macizo; con relleno real pesa menos)`);
if (report.insideOut) console.log("  ⚠ las caras apuntan hacia adentro (volumen negativo): revisar el orden de los triángulos");
console.log(report.watertight ? "  ✓ malla cerrada (watertight)" : `  ✗ malla abierta: ${report.openEdges} aristas sueltas, ${report.nonManifoldEdges} aristas no-manifold`);
console.log(`  → ${outDir}/${slug}.{glb,stl,json}`);
if (!report.watertight && !opts["allow-open"]) process.exit(1);

// --- utilidades ---

function maxDim(g) {
  g.computeBoundingBox();
  const s = g.boundingBox.getSize(new THREE.Vector3());
  return Math.max(s.x, s.y, s.z) || 1;
}

function flipWinding(g) {
  const p = g.attributes.position;
  if (g.index) {
    const a = g.index.array;
    for (let i = 0; i < a.length; i += 3) [a[i + 1], a[i + 2]] = [a[i + 2], a[i + 1]];
  } else {
    for (let i = 0; i < p.count; i += 3) {
      for (let k = 0; k < 3; k++) {
        const t = p.getComponent(i + 1, k);
        p.setComponent(i + 1, k, p.getComponent(i + 2, k));
        p.setComponent(i + 2, k, t);
      }
    }
  }
}

function inspect(g) {
  const idx = g.index.array;
  const p = g.attributes.position;
  const edges = new Map();
  const parent = new Int32Array(p.count).map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  let degenerate = 0;
  let volume = 0;
  const a = new THREE.Vector3(), bb = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < idx.length; t += 3) {
    const tri = [idx[t], idx[t + 1], idx[t + 2]];
    if (tri[0] === tri[1] || tri[1] === tri[2] || tri[0] === tri[2]) { degenerate++; continue; }
    for (let k = 0; k < 3; k++) {
      const u = tri[k], v = tri[(k + 1) % 3];
      const key = u < v ? `${u},${v}` : `${v},${u}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
      parent[find(u)] = find(v);
    }
    a.fromBufferAttribute(p, tri[0]); bb.fromBufferAttribute(p, tri[1]); c.fromBufferAttribute(p, tri[2]);
    volume += a.dot(bb.cross(c)) / 6; // volumen con signo (tetraedro al origen)
  }
  let openEdges = 0, nonManifoldEdges = 0;
  for (const n of edges.values()) {
    if (n === 1) openEdges++;
    else if (n > 2) nonManifoldEdges++;
  }
  const roots = new Set();
  for (let t = 0; t < idx.length; t++) roots.add(find(idx[t]));
  return {
    triangles: idx.length / 3,
    shells: roots.size,
    degenerateTriangles: degenerate,
    openEdges,
    nonManifoldEdges,
    watertight: openEdges === 0 && nonManifoldEdges === 0,
    // Volumen negativo = caras invertidas (normales hacia adentro).
    insideOut: volume < 0,
    volumeM3: Math.abs(volume),
  };
}

function toBinaryStl(g, name) {
  // Y arriba (three.js) → Z arriba (slicers), en milímetros.
  const idx = g.index.array;
  const p = g.attributes.position;
  const triCount = idx.length / 3;
  const buf = Buffer.alloc(84 + triCount * 50);
  buf.write(`3dprint-ecommerce ${name}`.slice(0, 80), 0, "ascii");
  buf.writeUInt32LE(triCount, 80);
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  let off = 84;
  for (let t = 0; t < idx.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      v[k].fromBufferAttribute(p, idx[t + k]);
      v[k].set(v[k].x * 1000, -v[k].z * 1000, v[k].y * 1000);
    }
    n.crossVectors(e1.subVectors(v[1], v[0]), e2.subVectors(v[2], v[0])).normalize();
    for (const w of [n, ...v]) {
      buf.writeFloatLE(w.x, off); buf.writeFloatLE(w.y, off + 4); buf.writeFloatLE(w.z, off + 8);
      off += 12;
    }
    off += 2; // attribute byte count
  }
  return buf;
}
