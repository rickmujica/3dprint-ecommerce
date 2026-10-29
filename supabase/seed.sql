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

-- 10 modelos de ejemplo más (los GLB se generan con `npm run demo-models`).
insert into public.models
  (slug, title, description, category, tags, license, glb_url, thumbnail_url, size_x_mm, size_y_mm, size_z_mm, base_price, featured, published)
values
  ('llavero-panal', 'Llavero panal', 'Llavero hexagonal con celdas caladas tipo panal de abejas. Liviano, imprime en 20 minutos y se puede personalizar con iniciales.', 'Accesorios', '{llavero,panal,regalo}', 'own', '/demo/llavero-panal.glb', '/demo/llavero-panal.webp', 83, 72, 6, 15000, false, true),
  ('portalapices-twist', 'Portalápices hexagonal twist', 'Portalápices de seis caras con un giro suave. Pared gruesa y base pesada para que no se vuelque en el escritorio.', 'Oficina', '{escritorio,organizador,hexagonal}', 'own', '/demo/portalapices-twist.glb', '/demo/portalapices-twist.webp', 108, 108, 108, 40000, true, true),
  ('posavasos-ondas', 'Posavasos ondas', 'Posavasos de 10 cm con ondas concéntricas que dejan correr la condensación. Se vende en juegos de 4 o 6.', 'Hogar', '{posavasos,cocina,set}', 'own', '/demo/posavasos-ondas.glb', '/demo/posavasos-ondas.webp', 99, 99, 9, 20000, false, true),
  ('dado-d20', 'Dado D20', 'Dado de veinte caras para juegos de rol, en tamaño grande. Lindo en PLA seda o en resina translúcida.', 'Juegos', '{dado,rol,d20}', 'own', '/demo/dado-d20.glb', '/demo/dado-d20.webp', 33, 33, 33, 18000, false, true),
  ('lampara-facetada', 'Pantalla de lámpara facetada', 'Pantalla de diez caras con giro, abierta arriba y abajo. En PLA blanco o natural deja pasar una luz cálida; usar con LED.', 'Decoración', '{lámpara,iluminación,low poly}', 'own', '/demo/lampara-facetada.glb', '/demo/lampara-facetada.webp', 155, 151, 165, 95000, true, true),
  ('gancho-pared', 'Gancho de pared', 'Gancho en J con placa trasera para atornillar o pegar con cinta doble faz. Para llaves, bolsos o auriculares; en PETG aguanta hasta 3 kg.', 'Hogar', '{gancho,pared,organización}', 'own', '/demo/gancho-pared.glb', '/demo/gancho-pared.webp', 63, 31, 169, 12000, false, true),
  ('soporte-auriculares', 'Soporte para auriculares', 'Soporte de escritorio con apoyo curvo que no marca la vincha. Base ancha para que no se caiga.', 'Accesorios', '{auriculares,escritorio,gamer}', 'own', '/demo/soporte-auriculares.glb', '/demo/soporte-auriculares.webp', 124, 56, 210, 55000, false, true),
  ('cuenco-twist', 'Cuenco facetado', 'Cuenco de nueve caras con giro, para llaves, frutas secas o como centro de mesa. Imprime sin soportes.', 'Hogar', '{cuenco,low poly,mesa}', 'own', '/demo/cuenco-twist.glb', '/demo/cuenco-twist.webp', 171, 171, 67, 50000, false, true),
  ('torre-ajedrez', 'Torre de ajedrez', 'Torre clásica con almenas, en tamaño grande para exhibir o para un tablero de jardín. Se puede pedir el juego completo.', 'Juegos', '{ajedrez,pieza,torre}', 'own', '/demo/torre-ajedrez.glb', '/demo/torre-ajedrez.webp', 90, 90, 156, 30000, false, true),
  ('organizador-cables', 'Organizador de cables', 'Peine con tres ranuras que sostiene los cables en el borde del escritorio. Se pega con cinta doble faz.', 'Oficina', '{cables,escritorio,organización}', 'own', '/demo/organizador-cables.glb', '/demo/organizador-cables.webp', 115, 20, 32, 10000, false, true)
on conflict (slug) do nothing;
