-- Catering packages (admin-managed), replacing the static data/catering.ts list.
CREATE TABLE public.catering_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  highlight text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  portion text NOT NULL DEFAULT '',
  includes_note text NOT NULL DEFAULT '',
  picada text NOT NULL DEFAULT '',
  cortes jsonb NOT NULL DEFAULT '[]'::jsonb,
  guarniciones jsonb NOT NULL DEFAULT '[]'::jsonb,
  utencilios jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.catering_packages TO anon, authenticated;
GRANT ALL ON public.catering_packages TO service_role;
ALTER TABLE public.catering_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active catering packages" ON public.catering_packages
  FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage catering packages" ON public.catering_packages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER catering_packages_touch_updated_at BEFORE UPDATE ON public.catering_packages
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.catering_packages
  (name, highlight, price, portion, includes_note, picada, cortes, guarniciones, utencilios, sort_order) VALUES
('PICADA', '', 70, '500 gr por persona', '', '',
 '["Punta de S, bife chorizo o ojo de bife","Entrañas","Pollerita s/h o colita de cuadril","Costilla primer corte","Linguiça tradicional y brisket","Morcilla"]',
 '["Pan de ajo","Yuca","Salsa verde","Llajua"]',
 '["Tabla para picar","Tablitas pequeñas","Parrilla (costo adicional)"]', 10),
('PICADA', 'PREMIUM', 75, '500 gr por persona', 'Todos los productos de Churrasqueando', '',
 '["Punta de S","Bife chorizo o ojo de bife","Pollerita s/h o colita de cuadril","Jibas maceradas","Matambres de cerdo macerados","Linguiça con quesos y tradicional","Pan con linguiça y morcilla"]',
 '["Pan de ajo","Yuca","Salsa verde","Llajua"]',
 '["Tabla para picar","Tablitas pequeñas","Parrilla (costo adicional)"]', 20),
('PLATO SERVIDO', '', 80, '500 gr por persona', '', '',
 '["Punta de S","Bife chorizo / ojo de bife","Costilla de res","Vacío","Linguiças"]',
 '["Arroz (primavera o con queso)","Yuca","Ensalada de tomate y cebolla","Ensalada de choclo","Llajua","Salsa verde"]',
 '["Platos","Cubiertos","Fuentes","Tablas y carbón","Parrilla (costo adicional)"]', 30),
('PLATO SERVIDO +', 'PICADA', 85, '500 gr por persona', '',
 'Jibas maceradas, matambres de cerdo macerados, entrañas y pan con linguiça.',
 '["Punta de S","Bife chorizo / ojo de bife","Costilla de res","Vacío","Linguiças premium"]',
 '["Arroz (primavera o con queso)","Yuca","Ensalada de tomate y cebolla","Ensalada de choclo","Llajua","Salsa verde"]',
 '["Platos","Cubiertos","Fuentes","Tablas y carbón","Parrilla (costo adicional)"]', 40);

-- Editable content blocks for the /club page (texts and images), admin-managed.
CREATE TABLE public.club_content (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.club_content TO anon, authenticated;
GRANT ALL ON public.club_content TO service_role;
ALTER TABLE public.club_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read club content" ON public.club_content
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage club content" ON public.club_content
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER club_content_touch_updated_at BEFORE UPDATE ON public.club_content
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('club-content', 'club-content', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read club content images" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'club-content');
CREATE POLICY "Admins upload club content images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'club-content' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update club content images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'club-content' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete club content images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'club-content' AND public.has_role(auth.uid(), 'admin'));

-- Course lessons ("subtítulos"): each course can have many lessons, each with
-- its own title, description and video.
CREATE TABLE public.course_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.club_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  video_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.course_lessons TO anon, authenticated;
GRANT ALL ON public.course_lessons TO service_role;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read lessons" ON public.course_lessons
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage lessons" ON public.course_lessons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER course_lessons_touch_updated_at BEFORE UPDATE ON public.course_lessons
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('course-videos', 'course-videos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read course videos" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'course-videos');
CREATE POLICY "Admins upload course videos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-videos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update course videos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'course-videos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete course videos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'course-videos' AND public.has_role(auth.uid(), 'admin'));

-- Contenido de ejemplo para las lecciones de cada curso (títulos y
-- descripciones ya redactados; el video queda pendiente de subir por el
-- admin). Se vincula por el título del curso ya sembrado en la migración
-- de cursos.
INSERT INTO public.course_lessons (course_id, title, description, sort_order)
SELECT c.id, l.title, l.description, l.sort_order
FROM public.club_courses c
JOIN (VALUES
  ('Maestro Churrasquero', 'Los dos secretos para un buen asado', 'Antes de prender el fuego: los dos principios que definen si un asado sale bien, sin importar la parrilla que tengas.', 10),
  ('Maestro Churrasquero', 'Cómo elegir cortes de buena calidad', 'Qué mirar en la carnicería: color, veteado, grosor y frescura para no fallar antes de empezar.', 20),
  ('Maestro Churrasquero', 'El control del calor', 'Zonas de calor directo e indirecto, y cómo moverte entre ellas según el corte.', 30),
  ('Maestro Churrasquero', 'Cómo sazonar tus cortes', 'Sal gruesa, tiempos de salado y cuándo condimentar cada tipo de corte.', 40),
  ('Maestro Churrasquero', 'Cómo asar tus cortes', 'Tiempos de vuelta, señales visuales y cómo evitar que se sequen.', 50),
  ('Maestro Churrasquero', 'Cómo elegir el término de cocción', 'Jugoso, a punto o bien cocido: cómo reconocerlo al tacto y con termómetro.', 60),
  ('Maestro Churrasquero', 'Cómo reposar y cortar tus cortes', 'Por qué el reposo es tan importante como la cocción, y cómo cortar contra la fibra.', 70),
  ('Maestro Churrasquero', 'Ribeye con aligot', 'Receta completa: ribeye a la parrilla acompañado de un aligot cremoso.', 80),

  ('Amos del Humo', 'Introducción al ahumado', 'Qué es el ahumado bajo y lento, y qué necesitas para empezar en casa.', 10),
  ('Amos del Humo', 'Tipos de ahumador y maderas', 'Offset, kamado, eléctrico: ventajas de cada uno y qué madera usar según el corte.', 20),
  ('Amos del Humo', 'Control de temperatura', 'Cómo mantener una temperatura estable durante horas sin perder el punto.', 30),
  ('Amos del Humo', 'Brisket paso a paso', 'El corte más desafiante del ahumado: recorte, rub, meseta y el envuelto.', 40),
  ('Amos del Humo', 'Costillas y pulled pork', 'La técnica 3-2-1 para costillas y cómo lograr un pulled pork jugoso.', 50),
  ('Amos del Humo', 'Salsas y el anillo de humo', 'Cómo lograr el anillo rosado y las salsas clásicas del BBQ americano.', 60),

  ('Fuego Ancestral', 'Elección y manejo de la leña', 'Qué maderas usar, cómo armar el fuego y cuánto necesitas para una asada larga.', 10),
  ('Fuego Ancestral', 'Encendido y administración del fuego', 'Cómo generar brasa constante y trasladarla durante horas de cocción.', 20),
  ('Fuego Ancestral', 'Asado a la cruz', 'Armado de la cruz, distancia al fuego y tiempos según el peso de la pieza.', 30),
  ('Fuego Ancestral', 'Asado al baral', 'La técnica del baral: montaje, rotación y control del calor.', 40),
  ('Fuego Ancestral', 'Adaptarte al clima', 'Cómo ajustar el fuego según viento, frío o lluvia sin arruinar la cocción.', 50),

  ('Maestría en Caja China', 'Armado y manejo de la caja china', 'Montaje correcto, distancia de las brasas y sellado para cocción pareja.', 10),
  ('Maestría en Caja China', 'Preparación del cerdo', 'Cortes recomendados, marinado y tiempos de reposo antes de cocinar.', 20),
  ('Maestría en Caja China', 'Tiempos y temperaturas', 'Tabla de tiempos según el peso de la pieza, para no quedarte corto ni pasarte.', 30),
  ('Maestría en Caja China', 'El punto crocante de la piel', 'El paso final para lograr un cuerito crocante parejo, sin quemarlo.', 40),

  ('Dry Age en Casa', 'La ciencia de la maduración', 'Qué pasa con la carne durante la maduración en seco, explicado simple.', 10),
  ('Dry Age en Casa', 'Cómo hacerlo seguro en casa', 'Condiciones de temperatura, humedad y ventilación mínimas para madurar sin riesgo.', 20),
  ('Dry Age en Casa', 'Tiempos y qué cortes sirven', 'Qué piezas rinden mejor y cuántos días de maduración según el resultado que buscas.', 30),
  ('Dry Age en Casa', 'Cómo evaluar el punto y cortar', 'Señales de que la pieza está lista, cómo recortar la costra y cortarla.', 40),

  ('Conocé la Res', 'Anatomía completa de la res', 'Recorrido por todas las secciones de la res antes de entrar al desposte.', 10),
  ('Conocé la Res', 'Desposte en vivo', 'Desposte completo mostrando cómo se separa cada corte de la media res.', 20),
  ('Conocé la Res', 'Qué técnica le va a cada corte', 'Parrilla, horno, cocción lenta: qué método saca lo mejor de cada pieza.', 30),
  ('Conocé la Res', 'Cómo reconocer calidad', 'Color, veteado y textura para elegir siempre el mejor corte disponible.', 40)
) AS l(course_title, title, description, sort_order) ON l.course_title = c.title;
