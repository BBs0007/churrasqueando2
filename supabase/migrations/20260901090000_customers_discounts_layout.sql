-- 1) Datos adicionales de cliente + foto de perfil
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS avatar_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 2) Códigos de descuento (admin) + registro histórico
CREATE TABLE public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  discount_type text NOT NULL DEFAULT 'percentage', -- 'percentage' | 'fixed'
  value numeric(10,2) NOT NULL DEFAULT 0,
  scope text NOT NULL DEFAULT 'all', -- 'all' | 'products' | 'categories'
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.discount_codes TO service_role;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage discount codes" ON public.discount_codes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER discount_codes_touch_updated_at BEFORE UPDATE ON public.discount_codes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.discount_code_products (
  code_id uuid NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  PRIMARY KEY (code_id, product_id)
);
GRANT ALL ON public.discount_code_products TO service_role;
ALTER TABLE public.discount_code_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage discount code products" ON public.discount_code_products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.discount_code_categories (
  code_id uuid NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  category_id text NOT NULL REFERENCES public.product_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (code_id, category_id)
);
GRANT ALL ON public.discount_code_categories TO service_role;
ALTER TABLE public.discount_code_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage discount code categories" ON public.discount_code_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) Layout de la tienda: secciones ordenables (best sellers, combos y bloques de categorías)
CREATE TABLE public.store_sections (
  id text PRIMARY KEY,
  kind text NOT NULL DEFAULT 'categories', -- 'best_sellers' | 'combos' | 'categories'
  title text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_sections TO anon, authenticated;
GRANT ALL ON public.store_sections TO service_role;
ALTER TABLE public.store_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read store sections" ON public.store_sections
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage store sections" ON public.store_sections
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER store_sections_touch_updated_at BEFORE UPDATE ON public.store_sections
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.product_categories
  ADD COLUMN IF NOT EXISTS section_id text REFERENCES public.store_sections(id) ON DELETE SET NULL;

INSERT INTO public.store_sections (id, kind, title, sort_order) VALUES
  ('best-sellers', 'best_sellers', 'Los Más Pedidos', 10),
  ('combos', 'combos', 'Combos', 20),
  ('cortes-carne-res', 'categories', 'Cortes de Carne de Res', 30),
  ('productos-churrasqueando', 'categories', 'Productos Churrasqueando', 40),
  ('cortes-para-casa-seccion', 'categories', 'Cortes para Casa', 50),
  ('extras-seccion', 'categories', 'Extras', 60);

UPDATE public.product_categories SET section_id = 'cortes-carne-res'
  WHERE id IN ('cortes-beef-club', 'cortes-procarnes', 'cortes-churrasqueando');
UPDATE public.product_categories SET section_id = 'productos-churrasqueando'
  WHERE id IN ('linguicas', 'pan-linguica', 'jibas-matambres');
UPDATE public.product_categories SET section_id = 'cortes-para-casa-seccion'
  WHERE id = 'cortes-para-casa';
UPDATE public.product_categories SET section_id = 'extras-seccion'
  WHERE id = 'extras';
