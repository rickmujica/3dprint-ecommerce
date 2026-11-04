export type LicenseId = "cc0" | "cc-by" | "cc-by-sa" | "commercial" | "own" | "permission";

export type Model = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  license: LicenseId;
  author_name: string | null;
  author_url: string | null;
  source_url: string | null;
  /** Ruta pública del GLB que usa el visor (p. ej. /files/public/models/<id>/model.glb). */
  glb_url: string;
  /** Ruta pública de la miniatura. */
  thumbnail_url: string | null;
  /** Clave privada en R2 del archivo original (STL/3MF). Nunca se expone. */
  source_file_key?: string | null;
  /** Medidas originales en mm. */
  size_x_mm: number | null;
  size_y_mm: number | null;
  size_z_mm: number | null;
  /** Precio base en la moneda del sitio. null = a cotizar. */
  base_price: number | null;
  /** Precio multicolor al 100 %. null = precio base × recargo multicolor de los ajustes. */
  multicolor_price: number | null;
  /** Zonas de color (pelo, ropa…). Vacío = pieza de un solo color. */
  color_zones: ColorZone[];
  /** El cliente no puede cambiar los colores de las zonas. */
  colors_locked: boolean;
  /** Tipos de filamento con los que se puede pedir. null = todos los disponibles. */
  allowed_materials: string[] | null;
  featured: boolean;
  published: boolean;
  created_at: string;
};

export type OrderStatus = "nuevo" | "cotizado" | "pagado" | "imprimiendo" | "listo" | "entregado" | "cancelado";

export type Order = {
  id: string;
  code: string;
  kind: "catalogo" | "personalizado";
  model_id: string | null;
  model_title: string | null;
  customer_name: string;
  email: string | null;
  phone: string | null;
  material: string;
  color: string | null;
  size: string;
  quantity: number;
  notes: string | null;
  reference_key: string | null;
  status: OrderStatus;
  quote_amount: number | null;
  color_mode: ColorMode;
  /** Color elegido para cada zona del modelo, si tiene zonas. */
  color_zones: ColorZone[] | null;
  /** Fecha estimada de entrega (YYYY-MM-DD) que se le mostró al cliente. */
  estimated_delivery: string | null;
  /** Precio estimado que vio el cliente. */
  estimated_price: number | null;
  created_at: string;
};

export type ColorZone = {
  name: string;
  /** Id de filamento de la paleta (ver lib/palette.ts). */
  color: string;
  /** Material del GLB que se tiñe en la vista previa (opcional). */
  material?: string;
};

export type ColorMode = "mono" | "multi";

export type WaitlistStatus = "pendiente" | "contactado" | "convertido" | "descartado";

/** Promesa de recontacto: un pedido que llegó con la cola llena. */
export type WaitlistEntry = {
  id: string;
  kind: "catalogo" | "personalizado";
  model_id: string | null;
  model_title: string | null;
  customer_name: string;
  email: string;
  phone: string | null;
  material: string;
  color_mode: ColorMode;
  color: string | null;
  color_zones: ColorZone[] | null;
  estimated_price: number | null;
  size: string;
  quantity: number;
  notes: string | null;
  reference_key: string | null;
  status: WaitlistStatus;
  order_id: string | null;
  contacted_at: string | null;
  created_at: string;
};

export type ShopSettings = {
  accepting_orders: boolean;
  max_queue: number;
  prints_per_day: number;
  /** Un pedido multicolor ocupa este número de lugares en la cola. */
  multicolor_time_factor: number;
  /** Precio multicolor = base × este factor (si el modelo no tiene precio multicolor propio). */
  multicolor_price_factor: number;
  /** Multiplicador de precio por tamaño, por id de tamaño. */
  size_price_factors: Record<string, number>;
};
