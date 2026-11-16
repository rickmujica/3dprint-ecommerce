-- Modelos que la tienda ya imprime y vende, con licencia que permite vender impresiones.
-- Los GLB y miniaturas están en public/catalogo (se sirven con el sitio, no hace falta subirlos a R2).
-- 1) Correr antes supabase/migrations/20261116010000_license_cc_by_nd.sql (en otra ejecución).
-- 2) Pegar esto en el SQL Editor de Supabase. Precios estimados por peso; se ajustan en /admin/modelos.
insert into public.models
  (slug, title, description, category, tags, license, author_name, author_url, source_url, glb_url, thumbnail_url, size_x_mm, size_y_mm, size_z_mm, base_price, featured, published)
values
  ('serpiente-articulada', 'Serpiente articulada',
   'Viborita flexible que se mueve y se enrosca: sale de la impresora ya articulada, sin armado ni pegamento. Mide unos 6 cm; ideal como fidget o regalito. Diseño de Amanda Roos (dominio público).',
   'Juegos', '{fidget,articulado,serpiente,regalo}', 'cc0', 'Amanda Roos', null, null,
   '/catalogo/serpiente-articulada.glb', '/catalogo/serpiente-articulada.webp', 10, 62, 8, 12000, false, true),
  ('clips-animalitos', 'Clips de animalitos (set de 11)',
   'Set de 11 clips sujetapapeles con siluetas de animalitos: conejito, gatito, osito y más. Finitos y planos, para marcar páginas, decorar la agenda o cerrar sobres. Cada clip mide unos 3 × 7 cm. Diseño de Rony 3D (dominio público).',
   'Oficina', '{clips,papelería,animales,agenda}', 'cc0', 'Rony 3D', null, null,
   '/catalogo/clips-animalitos.glb', '/catalogo/clips-animalitos.webp', 36, 75, 2, 21000, false, true),
  ('cortador-mono-sello', 'Cortador de galletas moño con sello',
   'Cortador de galletas con forma de moño de 8 cm que además marca el detalle del lazo en la masa o el fondant. Para baby showers, cumpleaños y mesas dulces. Diseño de thesugarcookiehouse (CC BY-ND).',
   'Cocina', '{cortador de galletas,moño,repostería,fondant}', 'cc-by-nd', 'thesugarcookiehouse', null, null,
   '/catalogo/cortador-mono-sello.glb', '/catalogo/cortador-mono-sello.webp', 84, 88, 16, 23000, false, true),
  ('barquito-benchy', 'Barquito Benchy',
   'El barquito más famoso de la impresión 3D (#3DBenchy). Mide 6 cm, sale en una sola pieza y queda divino como adorno de escritorio o regalo para fans de la impresión 3D.',
   'Figuras', '{barco,benchy,adorno}', 'cc-by-nd', 'Creative Tools', 'https://www.3dbenchy.com/', 'https://www.thingiverse.com/thing:763622',
   '/catalogo/barquito-benchy.glb', '/catalogo/barquito-benchy.webp', 31, 60, 48, 15000, false, true)
on conflict (slug) do nothing;
