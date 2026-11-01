---
name: modelo-imprimible
description: Crear o convertir un modelo 3D para la tienda (catálogo o pedido personalizado) a partir de una foto, una descripción o código three.js, y dejarlo listo para imprimir (STL cerrado, medidas en mm, gramos estimados) y para el visor web (GLB). Usar cuando haya que pasar de foto/idea a pieza imprimible, o revisar si un modelo three.js se puede imprimir.
---

# Modelo imprimible: de foto o idea a STL + GLB

Esta skill une tres piezas del repo:

- **`img2threejs`** (`.claude/skills/img2threejs`, submódulo): reconstruye en código three.js el
  objeto de una foto. Es lenta y gasta muchos tokens; úsala solo cuando hay una foto de referencia.
- **`threejs-geometry`**: referencia de geometrías three.js para modelar a mano formas simples
  (macetas, soportes, llaveros, cajas). Para eso no hace falta img2threejs.
- **`npm run export-printable`** (`scripts/export-printable.mjs`): convierte el modelo a STL (mm,
  Z arriba) + GLB (metros, Y arriba) y revisa que la malla esté cerrada.

## 0. Licencia primero

Antes de modelar, confirma de dónde sale el diseño. La tienda solo vende piezas con licencia que
permita vender impresiones (`supabase/migrations/20261028000000_init.sql`: `cc0`, `cc-by`,
`cc-by-sa`, `commercial`, `own`, `permission`; nunca CC "NC").

- Pieza propia de Rick o idea nueva → `own`.
- Foto que manda un cliente de **su** objeto o idea → pedido personalizado, va bien.
- Foto de un diseño ajeno (otra tienda, Thingiverse, Printables, un personaje con marca) → **no lo
  reconstruyas**. Rehacerlo desde una foto es copiar el diseño. Dilo y pide un modelo con licencia.

## 1. Construir el modelo

Guarda la fuente en `models/<slug>.ts` (o `.mjs`), dentro del repo para que encuentre `three`.
El archivo exporta `createObjectModel()` (o un `default`) que devuelve un `THREE.Object3D` o una
`THREE.BufferGeometry`. Las unidades no importan; la medida real se fija al exportar.

**Con foto** → invoca la skill `img2threejs` con la imagen. En "intended use" indica
*pieza para impresión 3D FDM, un solo color* y pásale estas reglas para que el resultado se pueda
imprimir:

- Solo sólidos cerrados: nada de `PlaneGeometry`, `CircleGeometry` sueltos ni cilindros
  `openEnded`. Láminas finas → `ExtrudeGeometry` o `BoxGeometry` con espesor.
- Pared mínima ≈ 1,2 mm y detalles de al menos 0,4 mm a la escala final (si no, el slicer los borra).
- Base plana para apoyar en la cama; voladizos de más de 45° solo si se aceptan soportes.
- Sin texturas, pelo de partículas ni materiales transparentes: la impresión es la forma.
- Piezas que se imprimen por separado → un archivo por pieza (`models/<slug>-<parte>.ts`).

img2threejs entrega `src/createObjectModel.ts` dentro de su espacio de trabajo: cópialo a
`models/<slug>.ts`. Recuerda decir a Rick que la parte de atrás, si no se ve en la foto, es inferida.

**Sin foto** → modela directo en `models/<slug>.ts` con `LatheGeometry` (perfil cerrado hasta el
eje), `ExtrudeGeometry`, `CylinderGeometry`, `TorusGeometry`, etc. Mira `scripts/make-demo-models.mjs`
como ejemplo.

## 2. Exportar y revisar

```bash
npm run export-printable -- models/<slug>.ts --size-mm 120            # 120 mm de alto
npm run export-printable -- models/<slug>.ts --size-mm 60 --axis max  # 60 mm en su lado mayor
```

Escribe en `out/printable/` (ignorado por git) `<slug>.stl`, `<slug>.glb` y `<slug>.json`. El
informe trae medidas en mm (z = alto en la cama), triángulos, cuerpos, aristas abiertas, volumen
y gramos de PLA macizo (cota superior: con 15–20 % de relleno pesa bastante menos).

- **Sale con código 1 si la malla está abierta.** Arréglalo en la fuente, no lo fuerces con
  `--allow-open` salvo para mirar el GLB.
- Varios cuerpos superpuestos (por ejemplo una argolla sobre una placa) están bien: los slicers los
  unen. El volumen cuenta dos veces la parte común, así que el peso queda algo alto.
- `insideOut: true` = caras hacia adentro; invierte el orden de los triángulos en la fuente.

Si el sitio corre en local, se puede mirar el GLB con model-viewer antes de subirlo.

## 3. Publicar

Sube el **STL** desde el panel `/admin` (Nuevo modelo): el navegador genera el GLB liviano, la
miniatura y las medidas, y guarda el STL original en `private/` de R2. Completa licencia y autor
(`own` si es de Rick). Para un pedido personalizado, adjunta el STL y la cotización al pedido;
el peso del informe ayuda a cotizar.

No subas a git los STL/GLB generados; sí la fuente `models/<slug>.ts`, así se puede regenerar a
otra medida.

## Para que img2threejs esté disponible

Es un submódulo fijado en una versión. En una copia nueva del repo:

```bash
git submodule update --init .claude/skills/img2threejs
```

Si `.claude/skills/img2threejs` está vacío, la skill no aparece: corre ese comando y abre una
sesión nueva. Para actualizarla:
`git -C .claude/skills/img2threejs pull origin main` y commitear el nuevo puntero. Necesita
Python 3.10+.
