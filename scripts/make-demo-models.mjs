// Genera los modelos GLB del catálogo demo en public/demo/.
// Uso: npm run demo-models
import { writeFileSync, mkdirSync } from "node:fs";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const OUT = new URL("../public/demo/", import.meta.url);
mkdirSync(OUT, { recursive: true });

/** Escribe un GLB mínimo (posiciones + normales + índices, un material PBR). */
function writeGlb(name, geometry, color, { roughness = 0.55, metalness = 0, flat = false } = {}) {
  // flat: caras facetadas (sin índice). Si no, normales suaves compartidas.
  const geo = flat && geometry.index ? geometry.toNonIndexed() : geometry;
  // Escala a metros (≈ tamaño real de la pieza) para que la realidad aumentada sea creíble.
  geo.scale(0.15, 0.15, 0.15);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  // Apoya la pieza sobre la cama (y = 0) y la centra en x/z.
  const box = geo.boundingBox;
  geo.translate(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  geo.computeBoundingBox();

  const pos = geo.attributes.position.array;
  const nor = geo.attributes.normal.array;
  const count = geo.attributes.position.count;
  const posBuf = Buffer.from(new Float32Array(pos).buffer);
  const norBuf = Buffer.from(new Float32Array(nor).buffer);
  const idx = geo.index ? Buffer.from(new Uint32Array(geo.index.array).buffer) : null;
  const bin = Buffer.concat(idx ? [posBuf, norBuf, idx] : [posBuf, norBuf]);

  const { min, max } = geo.boundingBox;
  const c = new THREE.Color(color).convertSRGBToLinear();
  const gltf = {
    asset: { version: "2.0", generator: "3dprint-ecommerce demo" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name }],
    meshes: [{ name, primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, ...(idx ? { indices: 2 } : {}), material: 0 }] }],
    materials: [
      {
        name: `${name}-pla`,
        pbrMetallicRoughness: { baseColorFactor: [c.r, c.g, c.b, 1], metallicFactor: metalness, roughnessFactor: roughness },
      },
    ],
    buffers: [{ byteLength: bin.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posBuf.length, target: 34962 },
      { buffer: 0, byteOffset: posBuf.length, byteLength: norBuf.length, target: 34962 },
      ...(idx ? [{ buffer: 0, byteOffset: posBuf.length + norBuf.length, byteLength: idx.length, target: 34963 }] : []),
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count, type: "VEC3", min: [min.x, min.y, min.z], max: [max.x, max.y, max.z] },
      { bufferView: 1, componentType: 5126, count, type: "VEC3" },
      ...(idx ? [{ bufferView: 2, componentType: 5125, count: geo.index.count, type: "SCALAR" }] : []),
    ],
  };

  const pad = (buf, byte) => {
    const rem = buf.length % 4;
    return rem ? Buffer.concat([buf, Buffer.alloc(4 - rem, byte)]) : buf;
  };
  const json = pad(Buffer.from(JSON.stringify(gltf)), 0x20);
  const binPadded = pad(bin, 0);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // "glTF"
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + json.length + 8 + binPadded.length, 8);
  const chunk = (type, data) => {
    const h = Buffer.alloc(8);
    h.writeUInt32LE(data.length, 0);
    h.writeUInt32LE(type, 4);
    return Buffer.concat([h, data]);
  };
  const glb = Buffer.concat([header, chunk(0x4e4f534a, json), chunk(0x004e4942, binPadded)]);
  writeFileSync(new URL(`${name}.glb`, OUT), glb);
  const mm = (v) => Math.round(v * 1000);
  console.log(`${name}.glb  ${(glb.length / 1024).toFixed(1)} KB  ${mm(max.x - min.x)}×${mm(max.z - min.z)}×${mm(max.y - min.y)} mm`);
}

// 1. Maceta geométrica: torno con pocos segmentos para un look facetado.
{
  const profile = [
    [0, 0], [0.32, 0], [0.36, 0.05], [0.5, 0.75], [0.54, 0.8], [0.54, 0.86], [0.46, 0.86], [0.42, 0.8], [0.3, 0.1], [0, 0.1],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  writeGlb("maceta-geometrica", new THREE.LatheGeometry(profile, 7), "#a855f7", { flat: true });
}

// 2. Jarrón espiral: torno con pared exterior, labio e interior, más nervaduras torcidas.
{
  const radius = (t) => 0.22 + 0.16 * Math.sin(t * Math.PI * 1.1) + 0.05 * t;
  const H = 1.3, N = 28, WALL = 0.03;
  const pts = [new THREE.Vector2(0, 0)];
  for (let i = 0; i <= N; i++) pts.push(new THREE.Vector2(radius(i / N), (i / N) * H));
  for (let i = N; i >= 0; i--) pts.push(new THREE.Vector2(radius(i / N) - WALL, Math.max((i / N) * H, 0.04)));
  pts.push(new THREE.Vector2(0, 0.04));
  const geo = new THREE.LatheGeometry(pts, 96);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r = Math.hypot(x, z);
    const a = Math.atan2(z, x) + y * 1.4;
    const rib = 1 + 0.05 * Math.cos(a * 8);
    p.setXYZ(i, Math.cos(a) * r * rib, y, Math.sin(a) * r * rib);
  }
  writeGlb("jarron-espiral", geo, "#06b6d4", { roughness: 0.35 });
}

// 3. Engranaje con agujero central.
{
  const teeth = 18, rOut = 0.6, rIn = 0.5;
  const shape = new THREE.Shape();
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const step = (Math.PI * 2) / teeth;
    const pts = [
      [rIn, a0], [rOut, a0 + step * 0.2], [rOut, a0 + step * 0.45], [rIn, a0 + step * 0.65], [rIn, a0 + step],
    ];
    pts.forEach(([r, a], j) => {
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0 && j === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.14, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 });
  geo.rotateX(-Math.PI / 2);
  writeGlb("engranaje", geo, "#84cc16", { roughness: 0.4, metalness: 0.1, flat: true });
}

// 4. Nudo toroidal decorativo.
writeGlb("nudo-toroidal", new THREE.TorusKnotGeometry(0.4, 0.13, 180, 24, 2, 3), "#ec4899", { roughness: 0.3 });

// 5. Soporte para celular: perfil en ángulo extruido.
{
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(0.9, 0);
  s.lineTo(0.9, 0.06);
  s.lineTo(0.3, 0.06);
  s.lineTo(0.62, 0.95);
  s.lineTo(0.56, 0.97);
  s.lineTo(0.22, 0.06);
  s.lineTo(0.12, 0.06);
  s.lineTo(0.12, 0.2);
  s.lineTo(0.06, 0.2);
  s.lineTo(0.06, 0.06);
  s.lineTo(0, 0.06);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.7, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1 });
  writeGlb("soporte-celular", geo, "#f97316", { roughness: 0.5, flat: true });
}

/** Une varias geometrías (todas pasan a no indexadas para que sean compatibles). */
const merge = (...geos) => mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)));

/** Gira cada vértice alrededor del eje Y en proporción a su altura. */
function twist(geo, turnsPerUnit) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = y * turnsPerUnit;
    p.setXYZ(i, x * Math.cos(a) - z * Math.sin(a), y, x * Math.sin(a) + z * Math.cos(a));
  }
  return geo;
}

/** Perfil de pared hueca para LatheGeometry: sube por fuera y baja por dentro. */
function shell(radius, height, { wall = 0.03, floor = 0.04, steps = 24 } = {}) {
  const pts = [new THREE.Vector2(0, 0)];
  for (let i = 0; i <= steps; i++) pts.push(new THREE.Vector2(radius(i / steps), (i / steps) * height));
  for (let i = steps; i >= 0; i--) pts.push(new THREE.Vector2(radius(i / steps) - wall, Math.max((i / steps) * height, floor)));
  pts.push(new THREE.Vector2(0, floor));
  return pts;
}

const hexagon = (r, path = new THREE.Shape(), cx = 0, cy = 0, rot = 0) => {
  for (let i = 0; i <= 6; i++) {
    const a = rot + (i / 6) * Math.PI * 2;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  return path;
};

// 6. Llavero panal: hexágono con celdas caladas y argolla.
{
  const shape = hexagon(0.27);
  for (const [cx, cy] of [[0, 0], [0.1, 0.058], [-0.1, 0.058], [0.1, -0.058], [-0.1, -0.058], [0, 0.116], [0, -0.116]]) {
    if (Math.hypot(cx, cy) > 0.12 && cy > 0.1) continue; // deja lugar para la argolla
    shape.holes.push(hexagon(0.045, new THREE.Path(), cx, cy, Math.PI / 6));
  }
  const ring = new THREE.Path();
  ring.absarc(0.2, 0, 0.035, 0, Math.PI * 2, true);
  shape.holes.push(ring);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 1 });
  geo.rotateX(-Math.PI / 2);
  writeGlb("llavero-panal", geo, "#eab308", { roughness: 0.45, flat: true });
}

// 7. Portalápices hexagonal con giro.
{
  const geo = new THREE.LatheGeometry(shell(() => 0.36, 0.72, { wall: 0.035, floor: 0.05, steps: 12 }), 6);
  writeGlb("portalapices-twist", twist(geo, 0.9), "#3b82f6", { roughness: 0.4, flat: true });
}

// 8. Posavasos con ondas concéntricas.
{
  const pts = [new THREE.Vector2(0, 0)];
  for (let i = 0; i <= 48; i++) {
    const r = (i / 48) * 0.3;
    pts.push(new THREE.Vector2(r, 0.03 + 0.008 * Math.cos(r * 70)));
  }
  pts.push(new THREE.Vector2(0.31, 0.06), new THREE.Vector2(0.33, 0.05), new THREE.Vector2(0.33, 0), new THREE.Vector2(0, 0));
  pts.reverse();
  writeGlb("posavasos-ondas", new THREE.LatheGeometry(pts, 72), "#14b8a6", { roughness: 0.5 });
}

// 9. Dado de 20 caras.
writeGlb("dado-d20", new THREE.IcosahedronGeometry(0.13, 0), "#f43f5e", { roughness: 0.3, flat: true });

// 10. Pantalla de lámpara facetada, abierta arriba y abajo.
{
  const outer = (t) => 0.3 + 0.22 * Math.sin(t * Math.PI * 0.9);
  const pts = [];
  for (let i = 0; i <= 10; i++) pts.push(new THREE.Vector2(outer(i / 10), (i / 10) * 1.1));
  for (let i = 10; i >= 0; i--) pts.push(new THREE.Vector2(outer(i / 10) - 0.02, (i / 10) * 1.1));
  pts.push(pts[0].clone());
  const geo = new THREE.LatheGeometry(pts, 10);
  writeGlb("lampara-facetada", twist(geo, 0.6), "#f8fafc", { roughness: 0.6, flat: true });
}

// 11. Gancho de pared en "J" con placa para tornillos.
{
  const s = new THREE.Shape();
  s.moveTo(0, 1.1);
  s.lineTo(0, 0.2);
  s.absarc(0.2, 0.2, 0.2, Math.PI, Math.PI * 2, false);
  s.lineTo(0.4, 0.42);
  s.lineTo(0.32, 0.42);
  s.lineTo(0.32, 0.2);
  s.absarc(0.2, 0.2, 0.12, 0, -Math.PI, true);
  s.lineTo(0.08, 1.1);
  s.closePath();
  const hook = new THREE.ExtrudeGeometry(s, { depth: 0.18, curveSegments: 24, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 });
  writeGlb("gancho-pared", hook, "#64748b", { roughness: 0.45, metalness: 0.15, flat: true });
}

// 12. Soporte para auriculares: base, columna y apoyo curvo.
{
  const s = new THREE.Shape();
  s.moveTo(-0.4, 0);
  s.lineTo(0.4, 0);
  s.lineTo(0.4, 0.06);
  s.quadraticCurveTo(0.06, 0.08, 0.05, 0.25);
  s.lineTo(0.05, 1.2);
  s.quadraticCurveTo(0.3, 1.2, 0.36, 1.32);
  s.lineTo(0.34, 1.37);
  s.quadraticCurveTo(0.2, 1.3, 0, 1.3);
  s.quadraticCurveTo(-0.2, 1.3, -0.34, 1.37);
  s.lineTo(-0.36, 1.32);
  s.quadraticCurveTo(-0.3, 1.2, -0.05, 1.2);
  s.lineTo(-0.05, 0.25);
  s.quadraticCurveTo(-0.06, 0.08, -0.4, 0.06);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.35, curveSegments: 16, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 });
  writeGlb("soporte-auriculares", geo, "#111827", { roughness: 0.35 });
}

// 13. Cuenco facetado con giro.
{
  const radius = (t) => 0.18 + 0.4 * Math.sin((t * Math.PI) / 2);
  const geo = new THREE.LatheGeometry(shell(radius, 0.45, { wall: 0.03, floor: 0.04, steps: 10 }), 9);
  writeGlb("cuenco-twist", twist(geo, 1.4), "#a855f7", { roughness: 0.35, flat: true });
}

// 14. Torre de ajedrez con almenas.
{
  const profile = [
    [0, 0], [0.3, 0], [0.3, 0.06], [0.26, 0.1], [0.26, 0.14], [0.2, 0.2], [0.16, 0.7], [0.22, 0.76], [0.22, 0.95], [0.15, 0.95], [0.15, 0.88], [0, 0.88],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const parts = [new THREE.LatheGeometry(profile, 48)];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const merlon = new THREE.BoxGeometry(0.075, 0.09, 0.07);
    merlon.rotateY(-a);
    merlon.translate(Math.cos(a) * 0.185, 0.995, Math.sin(a) * 0.185);
    parts.push(merlon);
  }
  writeGlb("torre-ajedrez", merge(...parts), "#f97316", { roughness: 0.4 });
}

// 15. Organizador de cables: peine con tres ranuras.
{
  const W = 0.75, H = 0.2, r = 0.045, g = 0.022;
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(W, 0);
  s.lineTo(W, H);
  for (const cx of [0.6, 0.375, 0.15]) {
    const cy = H - 0.075, top = Math.asin(g / r);
    s.lineTo(cx + g, H);
    s.lineTo(cx + g, cy + Math.cos(top) * r);
    s.absarc(cx, cy, r, Math.PI / 2 - top, -(3 * Math.PI) / 2 + top, true);
    s.lineTo(cx - g, H);
  }
  s.lineTo(0, H);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.12, curveSegments: 16, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 1 });
  writeGlb("organizador-cables", geo, "#84cc16", { roughness: 0.5, flat: true });
}
