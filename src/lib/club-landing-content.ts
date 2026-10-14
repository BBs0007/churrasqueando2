import {
  CLUB,
  CLUB_BENEFITS,
  CLUB_FAQS,
  CLUB_LAUNCH_OFFER,
  CLUB_TESTIMONIALS,
  FOUNDER_PERKS,
  PUNTOS_BRASA_STEPS,
} from "@/lib/club";

export type ClubLandingField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "image";
  help?: string;
};

export type ClubLandingCollection = {
  key: string;
  label: string;
  help: string;
  fields: { key: string; label: string; multiline?: boolean; optional?: boolean }[];
};

export type ClubLandingSection = {
  id: string;
  title: string;
  description: string;
  fields: ClubLandingField[];
  collections?: ClubLandingCollection[];
};

const collectionDefaults = {
  benefits: CLUB_BENEFITS,
  points_steps: PUNTOS_BRASA_STEPS,
  founder_perks: FOUNDER_PERKS,
  testimonials: CLUB_TESTIMONIALS,
  membership_perks: [
    { id: "courses", text: "Los 6 cursos y recetarios completos" },
    { id: "community", text: "Comunidad privada de parrilleros" },
    { id: "points", text: "Puntos Brasa para descuentos en productos" },
    { id: "founder", text: "Merch y precio congelado de fundador" },
    { id: "recordings", text: "Acceso a las grabaciones en vivo" },
  ],
  faqs: CLUB_FAQS,
};

export const CLUB_LANDING_DEFAULTS: Record<string, string> = {
  launch_banner: `Lanzamiento del ${CLUB.name} · 29 de septiembre`,
  hero_brand: CLUB.name,
  hero_title: "La plataforma más completa para dominar la parrilla",
  hero_subtitle: `${CLUB.coursesCount} cursos, recetarios y el soporte de nuestros parrilleros. Más una comunidad, Puntos Brasa y beneficios exclusivos de socio.`,
  hero_image: "",
  hero_image_alt: "Cortes sellándose sobre brasas",
  hero_founder_badge: "Precio de socio fundador · congelado de por vida",
  hero_cta: "Suscribirme hoy",
  hero_video_cta: "Ver el video",
  hero_stat_courses: String(CLUB.coursesCount),
  hero_stat_courses_label: "Cursos",
  hero_stat_lessons: "+120",
  hero_stat_lessons_label: "Lecciones",
  hero_stat_recipes: "+300",
  hero_stat_recipes_label: "Recetas",
  hero_stat_access: "24/7",
  hero_stat_access_label: "Acceso",
  problem_eyebrow: "El problema",
  problem_title: "¿Cansado de que cada asado sea una lotería?",
  problem_body: `Invitás gente y rezás para que la carne salga bien. A veces seca, a veces cruda. La verdad es simple: la buena carne hace el trabajo — solo falta que alguien te enseñe a no arruinarla. Eso es el ${CLUB.name}.`,
  video_eyebrow: "Así se vive el Club",
  video_title: "Mirá de qué se trata",
  video_image: "",
  video_image_alt: "Video de presentación del Club Churrasqueando",
  video_badge: "Video del Club · 3–4 min",
  video_overlay_title: "Así se vive el Club Churrasqueando",
  video_duration: "3:50",
  courses_eyebrow: "Todo incluido en tu membresía",
  courses_title: `Conocé nuestros ${CLUB.coursesCount} cursos`,
  courses_description:
    "Cada curso está pensado para llevarte de donde estás a donde querés llegar. Todos incluidos en el Club.",
  courses_cta: "Incluido · Suscríbete",
  benefits_eyebrow: "Más que cursos",
  benefits_title: "Beneficios del socio",
  points_eyebrow: "Recompensa por aprender",
  points_title: "Cómo funcionan los Puntos de Brasa",
  points_description:
    "Completa los videos de tus cursos, gana puntos y canjéalos como descuentos en productos, combos y la tienda del Club.",
  points_note: `Cada video completado suma ${CLUB.pointsPerCompletedLesson} puntos, y al completar todos los videos de un curso ganas ${CLUB.pointsPerCompletedCourse} puntos extra. Cada ${CLUB.redeemStep} Puntos de Brasa descuentan Bs ${CLUB.redeemValueBs}.`,
  founders_eyebrow: "Oferta de lanzamiento",
  founders_title: "Sé socio fundador",
  founders_description: `Los primeros ${CLUB.founders.total} socios entran a un precio que queda congelado para siempre, con beneficios que nadie más va a tener. Cuando se llenan los cupos, esta puerta se cierra.`,
  founders_total: String(CLUB.founders.total),
  founders_remaining: String(CLUB.founders.remaining),
  founders_quota_label: "Cupos de fundador",
  founders_remaining_label: "Quedan",
  founders_cta: "Quiero ser fundador",
  testimonials_eyebrow: "Lo que dicen los socios",
  testimonials_title: "Historias del fuego",
  testimonials_note: "(Testimonios de ejemplo — reemplazar con socios reales)",
  guarantee_title: "Probá 7 días sin riesgo",
  guarantee_body:
    "Entrá al Club, mirá los cursos y viví la comunidad. Si no es para vos, te devolvemos tu dinero. Sin vueltas.",
  membership_eyebrow: "Una sola membresía, todo adentro",
  membership_title: "Sumate al Club",
  membership_course_intro: `Un solo curso suelto cuesta ${CLUB.singleCoursePriceBs} Bs. Adentro del Club los tenés los ${CLUB.coursesCount}.`,
  membership_annual_price: String(CLUB_LAUNCH_OFFER.annualPriceBs),
  membership_price_caption: "Precio de lanzamiento, solo membresía anual",
  membership_regular_price: String(CLUB_LAUNCH_OFFER.realAnnualPriceBs),
  membership_period_label: "Bs / año",
  faq_eyebrow: "Dudas",
  faq_title: "Preguntas frecuentes",
  footer_brand: "Churrasqueando",
  footer_logo: "",
  footer_logo_alt: CLUB.name,
  footer_location: "Santa Cruz de la Sierra, Bolivia",
  footer_website: "churrasqueando.shop",
  seo_title: "Club Churrasqueando · La plataforma para dominar la parrilla",
  seo_description:
    "6 cursos, recetarios y el soporte de nuestros parrilleros. Comunidad, Puntos Brasa y beneficios exclusivos de Socio Fundador.",
  seo_social_title: "Club Churrasqueando · Domina la parrilla",
  seo_social_description:
    "Cursos, comunidad, Puntos Brasa y beneficios exclusivos para socios del Club Churrasqueando.",
};

export const CLUB_LANDING_SECTIONS: ClubLandingSection[] = [
  {
    id: "hero",
    title: "Franja y portada",
    description: "El primer mensaje, la imagen principal y los botones que ve la gente al entrar.",
    fields: [
      { key: "launch_banner", label: "Mensaje de lanzamiento", type: "text" },
      { key: "hero_brand", label: "Nombre pequeño sobre el título", type: "text" },
      { key: "hero_title", label: "Título principal", type: "textarea" },
      { key: "hero_subtitle", label: "Descripción bajo el título", type: "textarea" },
      { key: "hero_image", label: "Imagen de fondo de portada", type: "image" },
      { key: "hero_image_alt", label: "Descripción accesible de la imagen", type: "text" },
      { key: "hero_founder_badge", label: "Franja de precio fundador", type: "text" },
      { key: "hero_cta", label: "Texto del botón para suscribirse", type: "text" },
      { key: "hero_video_cta", label: "Texto del botón del video", type: "text" },
      { key: "hero_stat_courses", label: "Dato destacado: cursos", type: "text" },
      { key: "hero_stat_courses_label", label: "Etiqueta del dato: cursos", type: "text" },
      { key: "hero_stat_lessons", label: "Dato destacado: lecciones", type: "text" },
      { key: "hero_stat_lessons_label", label: "Etiqueta del dato: lecciones", type: "text" },
      { key: "hero_stat_recipes", label: "Dato destacado: recetas", type: "text" },
      { key: "hero_stat_recipes_label", label: "Etiqueta del dato: recetas", type: "text" },
      { key: "hero_stat_access", label: "Dato destacado: acceso", type: "text" },
      { key: "hero_stat_access_label", label: "Etiqueta del dato: acceso", type: "text" },
    ],
  },
  {
    id: "problem",
    title: "El problema",
    description: "El texto que explica el problema que resuelve el Club.",
    fields: [
      { key: "problem_eyebrow", label: "Texto pequeño", type: "text" },
      { key: "problem_title", label: "Título", type: "textarea" },
      { key: "problem_body", label: "Descripción", type: "textarea" },
    ],
  },
  {
    id: "video",
    title: "Presentación del Club",
    description:
      "Imagen, títulos y duración de la presentación. Actualmente se muestra como imagen.",
    fields: [
      { key: "video_eyebrow", label: "Texto pequeño", type: "text" },
      { key: "video_title", label: "Título de la sección", type: "text" },
      { key: "video_image", label: "Imagen de presentación", type: "image" },
      { key: "video_image_alt", label: "Descripción accesible de la imagen", type: "text" },
      { key: "video_badge", label: "Etiqueta sobre la imagen", type: "text" },
      { key: "video_overlay_title", label: "Título sobre la imagen", type: "text" },
      { key: "video_duration", label: "Duración mostrada", type: "text" },
    ],
  },
  {
    id: "courses",
    title: "Cursos",
    description:
      "Edita el encabezado de esta sección. Las fichas de cursos se gestionan en Administración > Cursos.",
    fields: [
      { key: "courses_eyebrow", label: "Texto pequeño", type: "text" },
      { key: "courses_title", label: "Título de la sección", type: "text" },
      { key: "courses_description", label: "Descripción", type: "textarea" },
      { key: "courses_cta", label: "Texto del botón de suscripción en cada curso", type: "text" },
    ],
  },
  {
    id: "benefits",
    title: "Beneficios del socio",
    description: "Administra las tarjetas que explican lo que recibe un socio.",
    fields: [
      { key: "benefits_eyebrow", label: "Texto pequeño", type: "text" },
      { key: "benefits_title", label: "Título de la sección", type: "text" },
    ],
    collections: [
      {
        key: "benefits",
        label: "Tarjetas de beneficios",
        help: "Cada tarjeta puede tener un título, descripción e insignia opcional.",
        fields: [
          { key: "title", label: "Título" },
          { key: "description", label: "Descripción", multiline: true },
          { key: "badge", label: "Insignia (opcional)", optional: true },
        ],
      },
    ],
  },
  {
    id: "points",
    title: "Puntos de Brasa",
    description: "Explica cómo se ganan y se canjean los puntos.",
    fields: [
      { key: "points_eyebrow", label: "Texto pequeño", type: "text" },
      { key: "points_title", label: "Título de la sección", type: "text" },
      { key: "points_description", label: "Descripción", type: "textarea" },
      { key: "points_note", label: "Nota de equivalencias debajo de los pasos", type: "textarea" },
    ],
    collections: [
      {
        key: "points_steps",
        label: "Pasos",
        help: "Describe en orden cómo el socio aprende y gana puntos.",
        fields: [
          { key: "title", label: "Título" },
          { key: "description", label: "Descripción", multiline: true },
        ],
      },
    ],
  },
  {
    id: "founders",
    title: "Socios fundadores",
    description: "Oferta, beneficios y cupos que aparecen en la sección de fundadores.",
    fields: [
      { key: "founders_eyebrow", label: "Texto pequeño", type: "text" },
      { key: "founders_title", label: "Título", type: "text" },
      { key: "founders_description", label: "Descripción", type: "textarea" },
      { key: "founders_total", label: "Cupos totales", type: "number" },
      { key: "founders_remaining", label: "Cupos disponibles", type: "number" },
      { key: "founders_quota_label", label: "Etiqueta de cupos", type: "text" },
      { key: "founders_remaining_label", label: "Texto junto a cupos disponibles", type: "text" },
      { key: "founders_cta", label: "Texto del botón", type: "text" },
    ],
    collections: [
      {
        key: "founder_perks",
        label: "Beneficios de fundador",
        help: "Se muestran como etiquetas debajo de la descripción.",
        fields: [{ key: "label", label: "Beneficio" }],
      },
    ],
  },
  {
    id: "testimonials",
    title: "Testimonios",
    description: "Edita, agrega, quita y ordena las historias que aparecen en la página.",
    fields: [
      { key: "testimonials_eyebrow", label: "Texto pequeño", type: "text" },
      { key: "testimonials_title", label: "Título", type: "text" },
      { key: "testimonials_note", label: "Nota bajo el título (opcional)", type: "text" },
    ],
    collections: [
      {
        key: "testimonials",
        label: "Historias",
        help: "Cada historia muestra una cita, el nombre y una breve referencia.",
        fields: [
          { key: "quote", label: "Testimonio", multiline: true },
          { key: "name", label: "Nombre" },
          { key: "role", label: "Referencia o cargo" },
        ],
      },
    ],
  },
  {
    id: "guarantee",
    title: "Garantía",
    description: "El compromiso que se muestra antes de la oferta de suscripción.",
    fields: [
      { key: "guarantee_title", label: "Título", type: "text" },
      { key: "guarantee_body", label: "Descripción", type: "textarea" },
    ],
  },
  {
    id: "membership",
    title: "Oferta y suscripción",
    description: "Información comercial y lista de lo que incluye el precio.",
    fields: [
      { key: "membership_eyebrow", label: "Texto pequeño", type: "text" },
      { key: "membership_title", label: "Título", type: "text" },
      {
        key: "membership_course_intro",
        label: "Texto sobre el valor de los cursos",
        type: "textarea",
      },
      {
        key: "membership_annual_price",
        label: "Precio anual de lanzamiento (Bs)",
        type: "number",
        help: "Este valor también se usa al registrar solicitudes de pago.",
      },
      { key: "membership_price_caption", label: "Texto del precio", type: "text" },
      { key: "membership_regular_price", label: "Precio anual regular (Bs)", type: "number" },
      { key: "membership_period_label", label: "Moneda y periodo junto al precio", type: "text" },
    ],
    collections: [
      {
        key: "membership_perks",
        label: "Lo que incluye la membresía",
        help: "Estos puntos aparecen en la lista debajo del precio.",
        fields: [{ key: "text", label: "Beneficio" }],
      },
    ],
  },
  {
    id: "faq",
    title: "Preguntas frecuentes",
    description: "Respuestas que ayudan a los visitantes a decidir.",
    fields: [
      { key: "faq_eyebrow", label: "Texto pequeño", type: "text" },
      { key: "faq_title", label: "Título", type: "text" },
    ],
    collections: [
      {
        key: "faqs",
        label: "Preguntas y respuestas",
        help: "Puedes añadir, quitar y reordenar preguntas.",
        fields: [
          { key: "question", label: "Pregunta" },
          { key: "answer", label: "Respuesta", multiline: true },
        ],
      },
    ],
  },
  {
    id: "footer",
    title: "Pie de página y SEO",
    description: "Datos al final de la página y textos que aparecen al compartir o buscar el Club.",
    fields: [
      { key: "footer_brand", label: "Nombre de marca", type: "text" },
      { key: "footer_logo", label: "Imagen del logo", type: "image" },
      { key: "footer_logo_alt", label: "Descripción accesible del logo", type: "text" },
      { key: "footer_location", label: "Ubicación", type: "text" },
      { key: "footer_website", label: "Sitio web", type: "text" },
      { key: "seo_title", label: "Título de la página en buscadores", type: "text" },
      { key: "seo_description", label: "Descripción para buscadores", type: "textarea" },
      { key: "seo_social_title", label: "Título al compartir", type: "text" },
      { key: "seo_social_description", label: "Descripción al compartir", type: "textarea" },
    ],
  },
];

export const CLUB_LANDING_COLLECTION_DEFAULTS: Record<string, unknown[]> = Object.fromEntries(
  Object.entries(collectionDefaults).map(([key, value]) => [
    key,
    JSON.parse(JSON.stringify(value)) as unknown[],
  ]),
);

for (const [key, value] of Object.entries(CLUB_LANDING_COLLECTION_DEFAULTS)) {
  CLUB_LANDING_DEFAULTS[key] = JSON.stringify(value);
}

export function getClubLandingText(content: Record<string, string>, key: string): string {
  const value = content[key]?.trim();
  return value || CLUB_LANDING_DEFAULTS[key] || "";
}

export function getClubLandingNumber(content: Record<string, string>, key: string): number {
  const parsed = Number(getClubLandingText(content, key));
  return Number.isFinite(parsed) ? parsed : Number(CLUB_LANDING_DEFAULTS[key] ?? 0);
}

export function getClubLandingCollection<T>(content: Record<string, string>, key: string): T[] {
  try {
    const parsed: unknown = JSON.parse(getClubLandingText(content, key));
    if (Array.isArray(parsed)) return parsed as T[];
  } catch {
    // Invalid admin-edited JSON falls back to the shipped defaults.
  }
  return (CLUB_LANDING_COLLECTION_DEFAULTS[key] ?? []) as T[];
}
