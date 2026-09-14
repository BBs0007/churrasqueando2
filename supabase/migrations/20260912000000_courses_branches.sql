-- Club courses (admin-managed), replacing the static data/club-cursos.ts list.
-- Branches / points of sale (admin-managed), replacing the static data/branches.ts list.

CREATE TABLE public.club_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  tag text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  bullets jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_url text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.club_courses TO anon, authenticated;
GRANT ALL ON public.club_courses TO service_role;
ALTER TABLE public.club_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active courses" ON public.club_courses
  FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage courses" ON public.club_courses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER club_courses_touch_updated_at BEFORE UPDATE ON public.club_courses
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('course-images', 'course-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read course images" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'course-images');
CREATE POLICY "Admins upload course images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update course images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'course-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete course images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'course-images' AND public.has_role(auth.uid(), 'admin'));

INSERT INTO public.club_courses (title, subtitle, tag, description, bullets, image_url, sort_order) VALUES
('Maestro Churrasquero', 'De cero al fuego perfecto', 'Curso insignia',
 'Si cada asado te sale distinto y estás cansado de depender de la suerte, este curso es para vos. De los fundamentos del fuego al punto perfecto de cada corte.',
 '["Fundamentos del calor, brasas y manejo por zonas","El punto exacto de cada corte","Sellado, reposo y timing","De los cortes finos a las piezas grandes"]',
 '/courses/curso-fuego.jpg', 10),
('Amos del Humo', 'Ahumados y BBQ estilo USA', 'BBQ & ahumados',
 '¿Viste esos ahumados que se deshacen solos y pensaste que eran imposibles en casa? No lo son. Dominá el BBQ norteamericano con control real de humo.',
 '["Tipos de ahumadores y maderas","Control de tiempo y temperatura: bajo y lento","Brisket, costillas, short ribs y pulled pork","Rubs, salsas y el anillo de humo"]',
 '/courses/curso-bbq.jpg', 20),
('Fuego Ancestral', 'Asado a la leña, a la cruz y al baral', 'Curso en línea',
 'Cocinar con fuego vivo es la técnica más ancestral y la más emocionante. Asá piezas completas a la cruz y al baral, como en las grandes celebraciones del sur.',
 '["Elección y manejo de la leña","Encendido y administración del fuego","Costillares y piezas enteras a la cruz","Cómo adaptarte al clima y al viento"]',
 '/courses/curso-lena.jpg', 30),
('Maestría en Caja China', 'El secreto del cerdo crocante', 'Curso en línea',
 'La forma más segura de sacar un cerdo entero crocante por fuera y jugoso por dentro. Aprendé los cortes, tiempos y temperaturas para nunca más arruinar una pieza grande.',
 '["Armado y manejo de la caja china","Cortes recomendados y su preparación","Tiempos y temperaturas según el peso","El punto crocante de la piel"]',
 NULL, 40),
('Dry Age en Casa', 'Maduración en seco, hecha por vos', 'Técnica premium',
 'La maduración en seco transforma tus cortes en otro nivel de suavidad y sabor. Aprendé a hacerlo de forma segura y precisa en casa. Sabor de restaurante, sin el precio.',
 '["La ciencia de la maduración, simple","Cómo hacerlo seguro en casa","Tiempos y qué cortes sirven","Cómo evaluar el punto y cortar"]',
 NULL, 50),
('Conocé la Res', 'Cortes y desposte completo', 'Clase maestra',
 'Dejá de comprar a ciegas. Conocé la res entera, corte por corte, con clases de desposte: qué es cada pieza, para qué sirve y cómo elegir la mejor calidad.',
 '["Anatomía completa de la res con desposte","Nombre y ubicación de cada corte","Qué técnica le va mejor a cada uno","Cómo reconocer y elegir calidad"]',
 '/courses/curso-cortes.jpg', 60);

CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.branches TO anon, authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active branches" ON public.branches
  FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage branches" ON public.branches
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER branches_touch_updated_at BEFORE UPDATE ON public.branches
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.branches (name, address, city, lat, lng, sort_order) VALUES
('Churrasqueando Central', 'Al frente del Condominio, Carretera Norte, 1/2 Km 10, Santa Cruz de la Sierra (8R8V+CW)', 'Santa Cruz de la Sierra', -17.6839375, -63.15518750000001, 10),
('SOLO CARNES', 'Zona Sur (17°48''29.7"S 63°11''26.5"W)', 'Santa Cruz de la Sierra', -17.80825, -63.190694, 20),
('LAS PALMAS', '5QVV+968, Av. Iberica, El Pari', 'Santa Cruz de la Sierra', -17.803564, -63.2097863, 30),
('SANTA VACA CARNE PREMIUM', '5QQQ+XW', 'Santa Cruz de la Sierra', -17.8100625, -63.2101875, 40),
('RED BEEF CARNICERIA', '6RQ7+56', 'Santa Cruz de la Sierra', -17.7620625, -63.1869375, 50),
('BRASIL CARNICERIA', 'MP2W+WQH, Calle Warnes 285', 'Montero', -17.3476718, -63.252973, 60);

-- Allow guest (unauthenticated) checkout orders to be recorded for admin sales reporting.
-- Guest orders are inserted via the service role from the submitOrder server function.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web';
