-- Combos administrables desde el panel (reemplaza data/combos.ts estático)
CREATE TABLE public.combos (
  id text PRIMARY KEY,
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  items text[] NOT NULL DEFAULT '{}',
  image_url text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.combos TO anon, authenticated;
GRANT ALL ON public.combos TO service_role;
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active combos" ON public.combos
  FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage combos" ON public.combos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER combos_touch_updated_at BEFORE UPDATE ON public.combos
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.combos (id, name, price, unit, description, items, image_url, active, sort_order) VALUES ('combo-brasuco', 'Combo Brasuco', 600, 'hasta 12 personas', 'Bananinha, picaña, maminha, pan con linguiça y linguiças. Hasta para 12 personas.', ARRAY['1.5 kg Bananinha','1 kg Picaña','1,5 kg Maminha (colita de cuadril)','2 unid. Pan con Linguiça','2 unid. Linguiças']::text[], '/combos/combo-brasuco.jpeg', true, 10);
INSERT INTO public.combos (id, name, price, unit, description, items, image_url, active, sort_order) VALUES ('combo-gaucho', 'Combo Gaucho', 919, 'hasta 20 personas', 'El más grande: costilla, entraña, corazón de cuadril, molleja, linguiças, morcilla y matambre. Hasta para 20 personas.', ARRAY['3 kg Costilla 1er corte','2 kg Entraña','3 kg Corazón de cuadril','1 kg Molleja','1 kg Linguiças','0.5 kg Morcilla y matambre']::text[], '/combos/combo-gaucho.jpeg', true, 20);
INSERT INTO public.combos (id, name, price, unit, description, items, image_url, active, sort_order) VALUES ('combo-espanolisimo', 'Combo Españolisimo', 719, 'hasta 15 personas', 'Punta de S premium, tira, linguiças, entraña, colita de cuadril, jiba y panes XL. Hasta para 15 personas.', ARRAY['1.5 kg Punta de S premium','1.5 kg Tira','1.5 kg Linguiças (a elección)','1 kg Entraña','1.5 kg Colita de cuadril','1 paquete de Jiba maserada','2 Panes con Linguiça XL','1 Sal de 0.5 kg a elección']::text[], '/combos/combo-espanolisimo.jpeg', true, 30);
INSERT INTO public.combos (id, name, price, unit, description, items, image_url, active, sort_order) VALUES ('combo-gringo', 'Combo Gringo', 583, 'hasta 15 personas', 'Ojo de bife, bife de chorizo, cowboy, sal ahumada y linguiças brisket. Hasta para 15 personas.', ARRAY['3 kg Ojo de bife','1.5 kg Bife de chorizo','1 kg Cowboy','1 Sal ahumada','1 kg Linguiças Brisket']::text[], '/combos/combo-gringo.jpeg', true, 40);
INSERT INTO public.combos (id, name, price, unit, description, items, image_url, active, sort_order) VALUES ('combo-argentina', 'Combo Argentina', 509, 'hasta 10 personas', 'Bife de chorizo premium, linguiças a elección, pan con linguiça y sal. Hasta para 10 personas.', ARRAY['4 kg de Bife de chorizo premium','1 kg Linguiças (a elección)','2 Pan con Linguiça','1 Sal de 0.5 kg a elección']::text[], '/combos/combo-argentina.jpeg', true, 50);
INSERT INTO public.combos (id, name, price, unit, description, items, image_url, active, sort_order) VALUES ('combo-orale-guey', 'Combo Órale Guey', 419, 'hasta 10 personas', 'Ojo de bife, entraña, panes con linguiça, sal y chimichurri. Hasta para 10 personas.', ARRAY['3 kg de Ojo de bife','1 kg de Entraña','2 Panes con Linguiça','1 Sal','1 Salsa chimichurri']::text[], '/combos/combo-orale-guey.jpeg', true, 60);
-- Registrar el código de descuento aplicado (si hubo) en cada pedido
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_code text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0;
