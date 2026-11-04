"use client";

import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as fflate from "three/examples/jsm/libs/fflate.module.js";

// fflate viene incluido en three; sus tipos apuntan al paquete "fflate", que no instalamos.
const { unzipSync } = fflate as unknown as { unzipSync: (data: Uint8Array) => Record<string, Uint8Array> };

const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", bin: "application/octet-stream" };

/**
 * Convierte un ZIP de glTF (scene.gltf + .bin + texturas, como lo entrega Sketchfab) en un único GLB.
 * Corre en el navegador del admin.
 */
export async function gltfZipToGlb(zip: Blob, name = "model"): Promise<File> {
  const entries = unzipSync(new Uint8Array(await zip.arrayBuffer()));
  const gltfPath = Object.keys(entries).find((p) => p.toLowerCase().endsWith(".gltf") && !p.startsWith("__MACOSX"));
  if (!gltfPath) throw new Error("El ZIP no trae un archivo .gltf");
  const baseDir = gltfPath.includes("/") ? gltfPath.slice(0, gltfPath.lastIndexOf("/") + 1) : "";

  const urls = new Map<string, string>();
  for (const [path, data] of Object.entries(entries)) {
    if (!path.startsWith(baseDir) || path.endsWith("/")) continue;
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    const blob = new Blob([data as Uint8Array<ArrayBuffer>], { type: MIME[ext] ?? "application/octet-stream" });
    urls.set(path.slice(baseDir.length), URL.createObjectURL(blob));
  }

  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    const clean = decodeURIComponent(url).replace(/^\.?\//, "");
    return urls.get(clean) ?? url;
  });

  try {
    const text = new TextDecoder().decode(entries[gltfPath]);
    const gltf = await new GLTFLoader(manager).parseAsync(text, "");
    const glb = (await new GLTFExporter().parseAsync(gltf.scene, { binary: true })) as ArrayBuffer;
    return new File([glb], `${name}.glb`, { type: "model/gltf-binary" });
  } finally {
    for (const u of urls.values()) URL.revokeObjectURL(u);
  }
}
