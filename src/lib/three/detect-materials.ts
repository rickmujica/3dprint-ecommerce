"use client";

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Lista los materiales con nombre de un GLB y su color base. Si el original (3MF/GLB) traía
 * las partes en colores separados, cada material es una zona que el visor puede teñir por nombre.
 */
export async function detectMaterials(url: string): Promise<{ name: string; hex: string }[]> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const found = new Map<string, string>();
  gltf.scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m?.name || found.has(m.name)) continue;
      const color = (m as THREE.MeshStandardMaterial).color;
      found.set(m.name, color ? `#${color.getHexString()}` : "#888888");
    }
  });
  return [...found].map(([name, hex]) => ({ name, hex }));
}
