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
  created_at: string;
};
