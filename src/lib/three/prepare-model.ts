"use client";

import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type PreparedModel = {
  glb: Blob;
  thumbnail: Blob;
  /** Medidas en mm (ancho X, profundidad Y, alto Z), asumiendo que el archivo está en mm. */
  size: { x: number; y: number; z: number };
  triangles: number;
};

export const SUPPORTED_EXTENSIONS = ["stl", "obj", "3mf", "glb"] as const;

/**
 * Convierte el archivo original (STL/OBJ/3MF/GLB) en un GLB liviano para el visor web y genera una miniatura.
 * Corre en el navegador del admin: no gasta CPU del Worker.
 */
export async function prepareModel(file: File, color = "#a855f7"): Promise<PreparedModel> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  const buffer = await file.arrayBuffer();
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0 });

  let object: THREE.Object3D;
  let zUp = true; // STL/3MF/OBJ de impresión vienen con Z hacia arriba; glTF usa Y.

  if (ext === "stl") {
    const geo = new STLLoader().parse(buffer);
    object = new THREE.Mesh(compact(geo), material);
  } else if (ext === "obj") {
    object = new OBJLoader().parse(new TextDecoder().decode(buffer));
    object.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry = compact(o.geometry);
        o.material = material;
      }
    });
  } else if (ext === "3mf") {
    object = new ThreeMFLoader().parse(buffer);
    zUp = false; // el loader ya rota a Y-up
  } else if (ext === "glb") {
    object = (await new GLTFLoader().parseAsync(buffer, "")).scene;
    zUp = false;
  } else {
    throw new Error(`Formato no soportado: .${ext}`);
  }

  // Medidas antes de rotar, en el sistema del archivo (mm).
  const rawBox = new THREE.Box3().setFromObject(object);
  const rawSize = rawBox.getSize(new THREE.Vector3());
  const size = zUp
    ? { x: round(rawSize.x), y: round(rawSize.y), z: round(rawSize.z) }
    : { x: round(rawSize.x), y: round(rawSize.z), z: round(rawSize.y) };

  const root = new THREE.Group();
  root.add(object);
  if (zUp) object.rotation.x = -Math.PI / 2;
  // Escala a metros (1 mm = 0,001) para que la realidad aumentada muestre el tamaño real.
  root.scale.setScalar(0.001);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.set(-center.x, -box.min.y, -center.z);
  root.updateMatrixWorld(true);

  let triangles = 0;
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const g = o.geometry as THREE.BufferGeometry;
      triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
    }
  });

  const scene = new THREE.Scene();
  scene.add(root);
  const glbBuffer = (await new GLTFExporter().parseAsync(scene, { binary: true })) as ArrayBuffer;
  const glb = new Blob([glbBuffer], { type: "model/gltf-binary" });
  const thumbnail = await renderThumbnail(scene);

  return { glb, thumbnail, size, triangles };
}

/**
 * Une vértices repetidos y descarta las normales: el GLB pesa ~3 veces menos que el STL
 * y el visor sombrea plano, que es justo como se ve una pieza impresa.
 */
function compact(geo: THREE.BufferGeometry) {
  for (const name of Object.keys(geo.attributes)) if (name !== "position") geo.deleteAttribute(name);
  return mergeVertices(geo, 1e-4);
}

const round = (n: number) => Math.round(n * 10) / 10;

async function renderThumbnail(scene: THREE.Scene, px = 800): Promise<Blob> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(px, px, false);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const lights = new THREE.Group();
  lights.add(new THREE.HemisphereLight(0xffffff, 0x444466, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.5);
  key.position.set(3, 5, 4);
  lights.add(key);
  const rim = new THREE.DirectionalLight(0xbbaaff, 1.2);
  rim.position.set(-4, 2, -3);
  lights.add(rim);
  scene.add(lights);

  const sphere = new THREE.Box3().setFromObject(scene).getBoundingSphere(new THREE.Sphere());
  const camera = new THREE.PerspectiveCamera(30, 1, sphere.radius / 100, sphere.radius * 100);
  const dist = (sphere.radius / Math.sin(THREE.MathUtils.degToRad(15))) * 0.85;
  const dir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(65), THREE.MathUtils.degToRad(35));
  camera.position.copy(sphere.center).addScaledVector(dir, dist);
  camera.lookAt(sphere.center);

  renderer.render(scene, camera);
  scene.remove(lights);

  const blob = await new Promise<Blob | null>((resolve) => renderer.domElement.toBlob(resolve, "image/webp", 0.9));
  renderer.dispose();
  if (!blob) throw new Error("No se pudo generar la miniatura");
  return blob;
}
