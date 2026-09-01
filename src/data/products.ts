// El catálogo de productos ahora se administra desde el panel de Admin
// (/admin-productos) y vive en la base de datos (tablas product_categories
// y products). Ver src/lib/catalog.functions.ts para las consultas.
// Este archivo solo conserva los tipos compartidos y la configuración fija.

export type Product = {
  id: string;
  name: string;
  price: number;
  unit: string;
  description: string;
  image?: string;
  hoverImage?: string;
};

export type Category = {
  id: string;
  name: string;
  tagline: string;
  products: Product[];
};

export const CURRENCY = "Bs";
