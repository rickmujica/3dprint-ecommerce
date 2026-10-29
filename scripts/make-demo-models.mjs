// Genera los modelos GLB del catálogo demo en public/demo/.
// Uso: npm run demo-models
import { writeFileSync, mkdirSync } from "node:fs";
import * as THREE from "three";

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
  console.log(`${name}.glb  ${(glb.length / 1024).toFixed(1)} KB`);
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
