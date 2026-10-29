// Genera las miniaturas del catálogo demo renderizando cada GLB con <model-viewer>.
// Requiere el sitio corriendo (npm run dev o npm run preview) y Playwright instalado.
// Uso: BASE_URL=http://localhost:3000 node scripts/capture-demo-thumbnails.mjs [slug ...]
import { readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

// Usa el Playwright del proyecto o el instalado globalmente.
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
// Sin argumentos, captura todos los GLB de public/demo.
const slugs = process.argv.length > 2
  ? process.argv.slice(2)
  : readdirSync(new URL("../public/demo/", import.meta.url)).filter((f) => f.endsWith(".glb")).map((f) => f.slice(0, -4));

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 1 });

for (const slug of slugs) {
  await page.goto(`${BASE}/modelos/${slug}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("model-viewer")?.loaded === true, null, { timeout: 60_000 });
  const dataUrl = await page.evaluate(async () => {
    const mv = document.querySelector("model-viewer");
    mv.autoRotate = false;
    mv.cameraOrbit = "35deg 65deg auto";
    mv.jumpCameraToGoal();
    await new Promise((r) => setTimeout(r, 500));
    const blob = await mv.toBlob({ mimeType: "image/webp", qualityArgument: 0.9, idealAspect: true });
    return await new Promise((r) => {
      const fr = new FileReader();
      fr.onload = () => r(fr.result);
      fr.readAsDataURL(blob);
    });
  });
  const buf = Buffer.from(dataUrl.split(",")[1], "base64");
  writeFileSync(new URL(`../public/demo/${slug}.webp`, import.meta.url), buf);
  console.log(`${slug}.webp ${(buf.length / 1024).toFixed(1)} KB`);
}

await browser.close();
