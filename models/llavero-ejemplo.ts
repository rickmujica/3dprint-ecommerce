// Ejemplo para `npm run export-printable -- models/llavero-ejemplo.ts --size-mm 40 --axis max`.
// Placa + argolla + relieve espejado: tres cuerpos cerrados que el slicer une.
import * as THREE from "three";
export function createObjectModel(): THREE.Group {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.2, 48), new THREE.MeshStandardMaterial());
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.08, 16, 32), new THREE.MeshStandardMaterial());
  ring.position.set(0, 0, 1.05); ring.rotation.x = Math.PI / 2;
  const mirrored = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.4)); mirrored.position.y = 0.15; mirrored.scale.x = -1;
  g.add(plate, ring, mirrored);
  return g;
}
