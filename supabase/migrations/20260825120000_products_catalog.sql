-- Product catalog: admin-managed products & categories, replacing the static data/products.ts catalog.

CREATE TABLE public.product_categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_categories TO anon, authenticated;
GRANT ALL ON public.product_categories TO service_role;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories" ON public.product_categories
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage categories" ON public.product_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id text REFERENCES public.product_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  image_url text,
  is_best_seller boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active products" ON public.products
  FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage products" ON public.products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER products_touch_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER product_categories_touch_updated_at BEFORE UPDATE ON public.product_categories
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage bucket for admin-uploaded product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read product images" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'product-images');
CREATE POLICY "Admins upload product images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update product images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete product images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

-- Seed: migrate static catalog into product_categories / products

INSERT INTO public.product_categories (id, name, tagline, sort_order) VALUES ('cortes-beef-club', 'Cortes de Beef Club', 'Carne premium · Precio x kg', 10);
INSERT INTO public.product_categories (id, name, tagline, sort_order) VALUES ('cortes-procarnes', 'Cortes de Procarnes', 'Carne premium · Precio x kg', 20);
INSERT INTO public.product_categories (id, name, tagline, sort_order) VALUES ('cortes-churrasqueando', 'Cortes de Churrasqueando', 'Carne premium · Precio x kg', 30);
INSERT INTO public.product_categories (id, name, tagline, sort_order) VALUES ('linguicas', 'Linguiças', 'Precio x 500 gr', 40);
INSERT INTO public.product_categories (id, name, tagline, sort_order) VALUES ('pan-linguica', 'Pan con Linguiça', 'Precio x unidad', 50);
INSERT INTO public.product_categories (id, name, tagline, sort_order) VALUES ('jibas-matambres', 'Jibas & Matambres', 'Precio x 500 gr', 60);
INSERT INTO public.product_categories (id, name, tagline, sort_order) VALUES ('cortes-para-casa', 'Cortes para Casa', 'Cocinando · Precio x kg', 70);
INSERT INTO public.product_categories (id, name, tagline, sort_order) VALUES ('extras', 'Extras', 'Precio x unidad', 80);

INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'cortes-beef-club', 'Picaña', 164, '1 - 1,2 kg', 'Corte premium Beef Club. Peso aprox. 1 a 1,2 kg.', NULL, false, false, 10);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'cortes-beef-club', 'Punta de S', 139, '1 - 1,5 kg', 'Corte premium Beef Club. Peso aprox. 1 a 1,5 kg.', '/products/bc-punta-s.jpg', false, true, 20);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'cortes-beef-club', 'Fraldinha', 85, '1,2 - 3 kg', 'Corte premium Beef Club. Peso aprox. 1,2 a 3 kg.', '/products/bc-fraldinha.jpg', false, true, 30);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'cortes-beef-club', 'Bife de Chorizo', 90, '2 - 3,5 kg', 'Corte premium Beef Club. Peso aprox. 2 a 3,5 kg.', NULL, false, false, 40);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'cortes-beef-club', 'Lomo Grande', 90, '2 - 3,5 kg', 'Lomo grande Beef Club, un nuevo concepto en carnes. Peso aprox. 2 a 3,5 kg.', '/products/bc-lomo-grande.jpg', false, true, 50);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'cortes-beef-club', 'Ojo de Bife', 90, '2 - 3,5 kg', 'Corte premium Beef Club. Peso aprox. 2 a 3,5 kg.', '/products/bc-ojo-bife.jpg', false, true, 60);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'cortes-beef-club', 'Pollerita s/hueso', 80, '2 - 4,5 kg', 'Corte premium Beef Club. Peso aprox. 2 a 4,5 kg.', NULL, false, false, 70);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'cortes-beef-club', 'Colita de Cuadril', 82, '1 - 1,9 kg', 'Corte premium Beef Club. Peso aprox. 1 a 1,9 kg.', '/products/bc-colita-cuadril.jpg', false, true, 80);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'cortes-beef-club', 'Molleja', 57, '1 - 1,5 kg', 'Corte premium Beef Club. Peso aprox. 1 a 1,5 kg.', NULL, false, false, 90);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'cortes-procarnes', 'Bife de Chorizo', 107, '2 - 3,5 kg', 'Corte premium Procarnes. Peso aprox. 2 a 3,5 kg.', '/products/pc-bife-chorizo.jpg', false, true, 100);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'cortes-procarnes', 'Punta de S', 120, '1 - 1,7 kg', 'Corte premium Procarnes. Peso aprox. 1 a 1,7 kg.', NULL, false, false, 110);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'cortes-procarnes', 'Entrecostilla', 90, '1 - 1,7 kg', 'Corte premium Procarnes. Peso aprox. 1 a 1,7 kg.', NULL, false, false, 120);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'cortes-procarnes', 'Arañita', 82, '0,5 - 1 kg', 'Corte premium Procarnes. Peso aprox. 0,5 a 1 kg.', NULL, false, false, 130);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'cortes-procarnes', 'Entrañas', 79, '1 - 1,5 kg', 'Corte premium Procarnes. Peso aprox. 1 a 1,5 kg.', NULL, false, false, 140);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'cortes-procarnes', 'Pollerita s/h o Vacío', 81, '1 - 1,8 kg', 'Corte premium Procarnes. Peso aprox. 1 a 1,8 kg.', NULL, false, false, 150);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'cortes-churrasqueando', 'Punta de S', 120, '1 - 1,7 kg', 'Corte premium Churrasqueando. Peso aprox. 1 a 1,7 kg.', '/products/ch-punta-s.jpg', true, true, 160);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'cortes-churrasqueando', 'Entraña Delgada', 77, '1 - 1,5 kg', 'Entraña delgada Churrasqueando, lo mejor para tu churrasco. Peso aprox. 1 a 1,5 kg.', '/products/ch-entrana.jpg', false, true, 170);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'cortes-churrasqueando', 'Corazón de Cuadril', 75, '1 - 1,8 kg', 'Corte premium Churrasqueando. Peso aprox. 1 a 1,8 kg.', '/products/ch-corazon-cuadril.jpg', false, true, 180);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'cortes-churrasqueando', 'Ojo de Bife', 79, '2 - 3,5 kg', 'Ojo de bife Churrasqueando. Peso aprox. 2 a 3,5 kg.', '/products/ch-bife-ojo.jpg', false, true, 190);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'cortes-churrasqueando', 'Bife de Chorizo', 79, '2 - 3,5 kg', 'Bife de chorizo Churrasqueando, lo mejor para tu churrasco. Peso aprox. 2 a 3,5 kg.', '/products/ch-bife-chorizo.jpg', false, true, 200);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'cortes-churrasqueando', 'Costilla 1er Corte', 62, '1 - 1,5 kg', 'Costilla 1er corte Churrasqueando. Peso aprox. 1 a 1,5 kg.', '/products/ch-costilla-1er.jpg', false, true, 210);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'linguicas', 'Linguiça Brisket & Muzzarella', 39, '500 gr', 'Sabor rústico y potente, ideal para los amantes de la carne de verdad, con el toque del queso mozzarella.', '/products/ling-brisket-muzza.jpg', true, true, 220);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'linguicas', 'Linguiça Cheddar & Jalapeños', 39, '500 gr', 'El sabor profundo de la carne de res con la cremosidad del cheddar y el carácter de los jalapeños encurtidos.', '/products/ling-cheddar-jala.jpg', true, true, 230);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'linguicas', 'Linguiça Hierba Buena & Muzzarella', 39, '500 gr', 'La frescura de la hierbabuena se funde con la cremosidad del mozzarella y la linguiça tradicional.', '/products/ling-hierba-muzza.jpg', false, true, 240);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'linguicas', 'Linguiça Dulce Picante', 35, '500 gr', 'Un inicio suavemente dulce que realza la carne de cerdo, seguido de un picante sutil. Para quienes buscan algo diferente.', '/products/ling-dulce-picante.jpg', true, true, 250);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'linguicas', 'Linguiça Tradicional Cerdo', 35, '500 gr', 'La clásica linguiça de cerdo con el sabor tradicional del churrasco brasileño.', '/products/ling-tradicional.jpg', false, true, 260);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'linguicas', 'Linguiça Albahaca & Provolone', 39, '500 gr', 'El aroma fresco de la albahaca combinado con la intensidad del queso provolone en una linguiça inigualable.', '/products/ling-albahaca-provolone.jpg', false, true, 270);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'linguicas', 'Linguiça Capresse', 39, '500 gr', 'Inspirada en la clásica ensalada capresse: tomate, albahaca y mozzarella en una linguiça jugosa.', '/products/ling-capresse.jpg', true, true, 280);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'linguicas', 'Pack Completo Linguiças', 230, '8 unidades', 'Todas nuestras variedades en un solo pack: Brisket, Brisket & Muzzarella, Hierba & Mozzarella, Tradicional, Dulce Picante, Cheddar & Jalapeños y más. Ideal para compartir.', NULL, false, false, 290);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'pan-linguica', 'Pan con Linguiça Tradicional', 19, 'unidad', 'Pan recién horneado con nuestra linguiça tradicional a la parrilla.', '/products/pan-tradicional.jpg', false, true, 300);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'pan-linguica', 'Pan con Linguiça Cheeseburger', 19, 'unidad', 'Linguiça de res acompañada de queso cheddar y tocino ahumado. El sabor de una burger premium.', '/products/pan-cheeseburger.jpg', true, true, 310);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'pan-linguica', 'Pan con Linguiça Capresse', 19, 'unidad', 'Pan con linguiça capresse: tomate, albahaca y mozzarella recién salidos de la parrilla.', '/products/pan-capresse.jpg', true, true, 320);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'pan-linguica', 'Pan con Linguiça Picante Trato', 19, 'unidad', 'Para los amantes del picante: linguiça con un toque ardiente irresistible.', NULL, false, false, 330);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'jibas-matambres', 'Jiba Chimichurri', 44, '500 gr', 'Jiba marinada en chimichurri fresco, jugosa y llena de sabor.', NULL, false, false, 340);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'jibas-matambres', 'Jiba Ajo & Romero', 44, '500 gr', 'El aroma del ajo y el romero realzando una jiba tierna a la parrilla.', NULL, false, false, 350);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'jibas-matambres', 'Matambre de Cerdo Tradicional', 48, '500 gr', 'Matambre de cerdo tierno con el sabor tradicional del churrasco.', '/products/matambre-tradicional.jpg', false, true, 360);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'jibas-matambres', 'Matambre de Cerdo Miel & Mostaza', 48, '500 gr', 'El favorito: la ternura del matambre con un glaseado de miel y mostaza que se caramela en la parrilla.', '/products/matambre-miel-mostaza.jpg', true, true, 370);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'cortes-para-casa', 'Carne Picada', 45, 'aprox. 500 gr', 'Carne de res picada, ideal para tus comidas caseras del día a día.', '/products/casa-carne-picada.jpg', false, true, 380);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'cortes-para-casa', 'Carne Molida 1ra', 48, 'aprox. 500 gr', 'Carne molida de primera calidad, perfecta para hamburguesas, salsas y guisos.', '/products/casa-carne-molida.jpg', false, true, 390);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'extras', 'Panes Brito (8 unidades)', 25, '8 unidades', 'Panes Brito sabor original, con hierbas aromáticas. Asar al horno o en la parrilla hasta dorar. Contiene 8 unidades.', '/products/panes-brito.jpg', false, true, 400);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'extras', 'Llajua Ahumada Trato Extra Picante', 27, '240 gr', 'Llajua ahumada en leña, extra picante, a base de tomate y cebolla. Contenido neto 240 gr.', '/products/llajua-trato-extra-picante.jpg', false, true, 410);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'extras', 'Llajua Ahumada Trato Picante Suave', 27, '240 gr', 'Llajua ahumada en leña, picante suave, a base de tomate y cebolla. Contenido neto 240 gr.', '/products/llajua-trato-suave.jpg', false, true, 420);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'extras', 'Salsa Pal Asau', 27, 'unidad', 'Salsa artesanal Pal Asau, el acompañante ideal para tu asado.', '/products/pal-asau.jpg', false, true, 430);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'extras', 'Chimichurri El Churrasquero 375 gr', 26, '375 gr', 'Chimichurri 100% artesanal, un sabor único. Peso neto 375 gr. Refrigerar una vez abierto.', '/products/chimichurri-375.jpg', false, true, 440);
INSERT INTO public.products (id, category_id, name, price, unit, description, image_url, is_best_seller, active, sort_order) VALUES (gen_random_uuid(), 'extras', 'El Tapeque para Carnes 500 gr', 27, '500 gr', 'Condimento artesanal a base de ajo, cebolla y especias. Ideal para macerar carnes, papas al horno, arroz salteado o pan a la parrilla.', '/products/tapeque-carnes.jpg', false, true, 450);