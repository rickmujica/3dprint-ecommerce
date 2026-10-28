# Capa3D · ecommerce de impresiones 3D

Catálogo de modelos 3D con visor interactivo, pedidos de impresión y pedidos personalizados.
Next.js 16 corriendo en **Cloudflare Workers** (OpenNext), con **Supabase** (base de datos y login) y **Cloudflare R2** (archivos 3D).

> El nombre "Capa3D" es provisorio: se cambia en `src/lib/site.ts`.

## Qué incluye

- **Catálogo** con filtros por categoría y fichas por modelo.
- **Visor 3D** (`<model-viewer>`): rotar, zoom, realidad aumentada en el celular. Al elegir un color, el modelo se tiñe en vivo.
- **Pedido desde la ficha**: material, color, tamaño, cantidad y contacto. Genera un código (`P-XXXXXX`) y ofrece seguir por WhatsApp.
- **Pedido personalizado**: descripción + foto de referencia (se guarda privada en R2).
- **Panel admin** (`/admin`): subir modelos en STL, OBJ, 3MF o GLB. El navegador lo convierte a un GLB liviano, genera la miniatura y mide el tamaño en mm. El original queda privado. También lista los pedidos y permite cambiar estado y cotización.
- **Licencias**: cada modelo guarda licencia, autor y enlace al original. Solo se aceptan licencias que permiten vender impresiones (CC0, CC BY, CC BY-SA, comercial, propio o con permiso). Las CC "NC" quedan afuera a propósito.
- **SEO**: páginas prerenderizadas, metadata y Open Graph por modelo, JSON-LD `Product`, `sitemap.xml` y `robots.txt`.
- **Tema** blanco/negro con acentos de color, interruptor claro/oscuro y detalles "3D" (sombras extruidas, tarjetas que se inclinan, grilla de cama de impresión). Componentes compatibles con shadcn/ui.

Sin variables de entorno el sitio funciona en **modo demo** con 5 modelos de ejemplo (`public/demo`), así se puede ver y probar sin configurar nada.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # opcional: sin esto, modo demo
npm run dev                  # http://localhost:3000
```

Para probar el build real de Cloudflare (Workers + R2 locales):

```bash
npm run preview              # http://localhost:8787
```

## Puesta en marcha

### 1. Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com) (plan gratis).
2. En **SQL Editor**, corré `supabase/migrations/20261028000000_init.sql`. Opcional: `supabase/seed.sql` carga los modelos de ejemplo.
3. En **Authentication → Users**, creá tu usuario (email y contraseña) y hacelo admin:
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'vos@ejemplo.com';
   ```
4. En **Project Settings → API**, copiá la URL y la *publishable key* a `.env.local`.

> El plan gratis pausa el proyecto tras 7 días sin actividad. Con visitas reales no pasa, pero conviene saberlo.

### 2. Cloudflare (Workers + R2)

Para Next.js, Cloudflare recomienda **Workers con OpenNext** en lugar de Pages. Es el mismo plan gratis y la misma consola.

```bash
npx wrangler login
npx wrangler r2 bucket create 3dprint-models
npx wrangler r2 bucket create 3dprint-ecommerce-opennext-cache
npm run deploy
```

Las variables `NEXT_PUBLIC_*` se leen **al compilar**: tienen que estar en `.env.local` (deploy desde tu máquina) o en la configuración de build si conectás el repo con **Workers Builds** (build: `npx opennextjs-cloudflare build`, deploy: `npx opennextjs-cloudflare deploy`).

> R2 puede pedir una tarjeta para activarse aunque no cobre dentro del plan gratis (10 GB).

### 3. Variables

| Variable | Para qué |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | URL pública (canonical, sitemap, Open Graph) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública de Supabase (la seguridad la dan las políticas RLS) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número para el botón "Seguir por WhatsApp" (ej. `595981123456`) |

## Estructura

```
src/app/                 páginas (inicio, /modelos, /modelos/[slug], /pedido-personalizado, /admin)
src/app/actions/         Server Actions (pedidos, admin)
src/app/files/[...key]   sirve los archivos públicos de R2 (GLB, miniaturas)
src/app/api/admin/       subida a R2 y descarga de privados (solo admins)
src/components/          UI (shadcn en components/ui, visor, configurador, formularios)
src/lib/catalog.ts       lecturas cacheadas del catálogo ("use cache")
src/lib/three/           conversión STL/OBJ/3MF → GLB + miniatura (en el navegador)
supabase/                esquema, políticas RLS y datos de ejemplo
scripts/                 generadores de los modelos y miniaturas demo
```

## Notas

- **Archivos en R2**: `public/…` se sirve por `/files/…` con caché larga; `private/…` (STL originales y fotos de clientes) solo lo descarga un admin.
- **Caché**: el catálogo usa `"use cache"` con la etiqueta `models`. Al crear o publicar un modelo desde el admin se invalida solo.
- **Modelos de terceros**: no scrapear Thingiverse/Printables/MakerWorld (lo prohíben sus términos). Cargalos a mano con licencia y autor.
- **Sin pagos online todavía**: el flujo es cotizar y coordinar por WhatsApp.

## Próximos pasos sugeridos

- Pagos online (Mercado Pago, Bancard o Stripe, según el país).
- Aviso por email de cada pedido (Resend tiene plan gratis).
- Vista previa automática de pedidos personalizados con una API de imagen/texto a 3D (Tripo, Meshy o Hunyuan3D), con ajuste final en Blender.
- Compresión Draco/meshopt de los GLB para modelos muy pesados.
