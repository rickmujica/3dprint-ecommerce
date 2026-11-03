# Skills de Claude Code del proyecto

| Skill | Origen | Licencia |
|---|---|---|
| `modelo-imprimible` | propia | igual que el repo |
| `img2threejs` | submódulo de [img2threejs/img2threejs](https://github.com/img2threejs/img2threejs), fijado en `3e7099e` | Apache-2.0 |
| `threejs-geometry`, `threejs-asset-pipeline` | copiadas de [CloudAI-X/threejs-skills](https://github.com/cloudai-x/threejs-skills) @ `0e18186` | MIT (ver `LICENSE` en cada carpeta) |
| `threejs-scene`, `exploded-view`, `site-check`, `frame-capture`, `scroll-film`, `alpha-cutout`, `cursor-rig`, `motion-assets` | symlinks a `.claude/vendor/open-3d-skills/skills/*`, submódulo de [Moh4696/open-3d-skills](https://github.com/Moh4696/open-3d-skills) fijado en `7b04ab4` | MIT |

Los submódulos llegan vacíos en un clon nuevo: `git submodule update --init`. Hasta entonces los symlinks de open-3d-skills apuntan a nada y Claude Code no ve esas skills.

## Cuál usar

- **Modelo para imprimir (STL/GLB):** `modelo-imprimible`, con `threejs-geometry` para primitivas.
- **Imagen → escena three.js:** `img2threejs`.
- **Ficha de producto que muestra piezas por dentro o desarmadas:** `exploded-view`.
- **Escena 3D completa hecha con código (hero, luces, sombras, rendimiento):** `threejs-scene`. Se solapa en parte con `threejs-geometry`; esta es la más amplia.
- **Revisar una página 3D en Chromium y Safari, desktop y móvil:** `site-check`. **Grabarla a 60 fps:** `frame-capture`.
- **Marketing animado (video con scroll, video transparente, personaje que sigue el cursor, assets con IA):** `scroll-film`, `alpha-cutout`, `cursor-rig`, `motion-assets`.

Los scripts de open-3d-skills son Python local (ffmpeg, Playwright, OpenCV, un servidor HTTP en 127.0.0.1); las dependencias están en `.claude/vendor/open-3d-skills/requirements.txt` y no se instalan solas.
