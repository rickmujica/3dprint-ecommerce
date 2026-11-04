// Escritor GLB mínimo (posiciones + normales + índices, un material PBR), sin dependencias de navegador.
// Lo usan scripts/make-demo-models.mjs y scripts/export-printable.mjs.
import * as THREE from "three";

/**
 * Convierte una BufferGeometry (ya escalada y posicionada, en metros) en un Buffer GLB.
 * @param {THREE.BufferGeometry} geo
 * @param {{ name: string, color: THREE.ColorRepresentation, roughness?: number, metalness?: number, generator?: string }} opts
 */
export function geometryToGlb(geo, { name, color, roughness = 0.55, metalness = 0, generator = "3dprint-ecommerce" }) {
  if (!geo.boundingBox) geo.computeBoundingBox();
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
    asset: { version: "2.0", generator },
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
  return Buffer.concat([header, chunk(0x4e4f534a, json), chunk(0x004e4942, binPadded)]);
}

/**
 * GLB con varias partes, cada una con su propio material (nombre = parte). Sirve para modelos
 * multicolor: el visor web tiñe cada material por nombre y el admin los detecta como zonas.
 * @param {{ name: string, geometry: THREE.BufferGeometry, color: THREE.ColorRepresentation, roughness?: number }[]} parts
 *   Geometrías ya escaladas y posicionadas, con normales.
 */
export function partsToGlb(parts, { generator = "3dprint-ecommerce" } = {}) {
  const chunks = [];
  const bufferViews = [];
  const accessors = [];
  let offset = 0;
  const push = (buf, target) => {
    chunks.push(buf);
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: buf.length, target });
    offset += buf.length;
    return bufferViews.length - 1;
  };

  const meshes = parts.map((part, i) => {
    const geo = part.geometry.index ? part.geometry : part.geometry; // con o sin índice
    geo.computeBoundingBox();
    const { min, max } = geo.boundingBox;
    const count = geo.attributes.position.count;
    const pos = push(Buffer.from(new Float32Array(geo.attributes.position.array).buffer), 34962);
    accessors.push({ bufferView: pos, componentType: 5126, count, type: "VEC3", min: [min.x, min.y, min.z], max: [max.x, max.y, max.z] });
    const nor = push(Buffer.from(new Float32Array(geo.attributes.normal.array).buffer), 34962);
    accessors.push({ bufferView: nor, componentType: 5126, count, type: "VEC3" });
    let indices;
    if (geo.index) {
      const idx = push(Buffer.from(new Uint32Array(geo.index.array).buffer), 34963);
      accessors.push({ bufferView: idx, componentType: 5125, count: geo.index.count, type: "SCALAR" });
      indices = accessors.length - 1;
    }
    return {
      name: part.name,
      primitives: [{ attributes: { POSITION: accessors.length - (indices != null ? 3 : 2), NORMAL: accessors.length - (indices != null ? 2 : 1) }, ...(indices != null ? { indices } : {}), material: i }],
    };
  });

  const materials = parts.map((part) => {
    const c = new THREE.Color(part.color).convertSRGBToLinear();
    return {
      name: part.name,
      pbrMetallicRoughness: { baseColorFactor: [c.r, c.g, c.b, 1], metallicFactor: 0, roughnessFactor: part.roughness ?? 0.55 },
    };
  });

  const bin = Buffer.concat(chunks);
  const gltf = {
    asset: { version: "2.0", generator },
    scene: 0,
    scenes: [{ nodes: parts.map((_, i) => i) }],
    nodes: parts.map((part, i) => ({ mesh: i, name: part.name })),
    meshes,
    materials,
    buffers: [{ byteLength: bin.length }],
    bufferViews,
    accessors,
  };

  const pad = (buf, byte) => {
    const rem = buf.length % 4;
    return rem ? Buffer.concat([buf, Buffer.alloc(4 - rem, byte)]) : buf;
  };
  const json = pad(Buffer.from(JSON.stringify(gltf)), 0x20);
  const binPadded = pad(bin, 0);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + json.length + 8 + binPadded.length, 8);
  const chunk = (type, data) => {
    const h = Buffer.alloc(8);
    h.writeUInt32LE(data.length, 0);
    h.writeUInt32LE(type, 4);
    return Buffer.concat([h, data]);
  };
  return Buffer.concat([header, chunk(0x4e4f534a, json), chunk(0x004e4942, binPadded)]);
}
