-- "Tienda de promociones": productos y paquetes exclusivos para socios del
-- Club, visibles solo en /promociones. No aparecen en la tienda principal
-- (churrasqueando.shop / catálogo /tienda).

CREATE TABLE public.promo_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'unidad',
  description text NOT NULL DEFAULT '',
  image_url text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promo_products TO authenticated;
GRANT ALL ON public.promo_products TO service_role;
ALTER TABLE public.promo_products ENABLE ROW LEVEL SECURITY;

-- Solo usuarios logueados pueden leerlos (la página /promociones ya exige
-- sesión); la app además solo los muestra a socios activos o admins.
CREATE POLICY "Authenticated can read promo products" ON public.promo_products
  FOR SELECT TO authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage promo products" ON public.promo_products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER promo_products_touch_updated_at BEFORE UPDATE ON public.promo_products
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Paquetes/promociones: pueden combinar productos de promo_products y/o del
-- catálogo principal (public.products). Los ítems se guardan aparte, con un
-- "source" para saber de qué tabla vienen.
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  image_url text,
  price numeric(10,2),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read promotions" ON public.promotions
  FOR SELECT TO authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage promotions" ON public.promotions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER promotions_touch_updated_at BEFORE UPDATE ON public.promotions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.promotion_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('promo', 'catalog')),
  product_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promotion_items TO authenticated;
GRANT ALL ON public.promotion_items TO service_role;
ALTER TABLE public.promotion_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read promotion items" ON public.promotion_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage promotion items" ON public.promotion_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX promotion_items_promotion_id_idx ON public.promotion_items (promotion_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('promo-images', 'promo-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read promo images" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'promo-images');
CREATE POLICY "Admins upload promo images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'promo-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update promo images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'promo-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete promo images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'promo-images' AND public.has_role(auth.uid(), 'admin'));
