-- Datos de ejemplo (los mismos del modo demo). Los GLB viven en /public/demo del sitio.
insert into public.models
  (slug, title, description, category, tags, license, glb_url, thumbnail_url, size_x_mm, size_y_mm, size_z_mm, base_price, featured, published)
values
  ('jarron-espiral', 'Jarrón espiral', 'Jarrón con nervaduras torcidas, pensado para imprimirse en modo vaso (una sola pared). Queda espectacular en PLA seda o PETG translúcido.', 'Decoración', '{jarrón,modo vaso,decoración}', 'own', '/demo/jarron-espiral.glb', '/demo/jarron-espiral.webp', 110, 110, 200, 85000, true, true),
  ('maceta-geometrica', 'Maceta geométrica', 'Maceta low-poly de siete caras con base de drenaje. Para suculentas y cactus; imprime sin soportes.', 'Hogar', '{maceta,low poly,plantas}', 'own', '/demo/maceta-geometrica.glb', '/demo/maceta-geometrica.webp', 108, 108, 86, 45000, true, true),
  ('nudo-toroidal', 'Nudo toroidal', 'Escultura matemática (nudo trébol 2,3). Pieza de escritorio que luce cualquier color de filamento.', 'Decoración', '{escultura,matemática}', 'cc0', '/demo/nudo-toroidal.glb', '/demo/nudo-toroidal.webp', 106, 106, 40, 60000, true, true),
  ('engranaje', 'Engranaje de 18 dientes', 'Engranaje recto de repuesto con eje de 28 mm. Escalable; en PETG aguanta uso mecánico liviano.', 'Repuestos', '{engranaje,mecánica,repuesto}', 'own', '/demo/engranaje.glb', '/demo/engranaje.webp', 120, 120, 21, null, false, true),
  ('soporte-celular', 'Soporte para celular', 'Soporte de escritorio en ángulo para celular o tablet chica, con ranura para el cable de carga.', 'Accesorios', '{soporte,escritorio,celular}', 'own', '/demo/soporte-celular.glb', '/demo/soporte-celular.webp', 90, 70, 97, 35000, false, true)
on conflict (slug) do nothing;
