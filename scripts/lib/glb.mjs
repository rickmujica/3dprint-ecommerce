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
