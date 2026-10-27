import {
  CLUB,
  CLUB_BENEFITS,
  CLUB_FAQS,
  CLUB_LAUNCH_OFFER,
  CLUB_TESTIMONIALS,
  FOUNDER_PERKS,
  PUNTOS_BRASA_STEPS,
} from "@/lib/club";
import { CATERING_PAGE_DEFAULTS } from "@/lib/catering-page-content";

export type ClubLandingField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "image" | "video";
  help?: string;
};

export type ClubLandingCollection = {
  key: string;
  label: string;
  help: string;
  fields: {
    key: string;
    label: string;
    multiline?: boolean;
    optional?: boolean;
    image?: boolean;
  }[];
};

export type ClubLandingSection = {
  id: string;
  title: string;
  description: string;
  fields: ClubLandingField[];
  collections?: ClubLandingCollection[];
};

export const CLUB_BUILDER_SECTIONS = [
  { id: "banner", title: "Franja de lanzamiento" },
  { id: "hero", title: "Portada" },
  { id: "problem", title: "El problema" },
  { id: "video", title: "Presentación del Club" },
  { id: "courses", title: "Cursos" },
  { id: "benefits", title: "Beneficios" },
  { id: "points", title: "Puntos de Brasa" },
  { id: "founders", title: "Socios fundadores" },
  { id: "testimonials", title: "Testimonios" },
  { id: "guarantee", title: "Garantía" },
  { id: "membership", title: "Oferta y suscripción" },
  { id: "faq", title: "Preguntas frecuentes" },
  { id: "footer", title: "Pie de página" },
] as const;

export type ClubBuilderBlockType =
  "heading" | "subtitle" | "paragraph" | "image" | "video" | "price" | "button" | "subsection";
export type ClubBuilderContentBlockType = Exclude<ClubBuilderBlockType, "subsection">;
export type ClubBuilderBlock = {
  id: string;
  type: ClubBuilderBlockType;
  title: string;
  text: string;
  url: string;
  layout: "vertical" | "horizontal";
  children: ClubBuilderBlock[];
};
export type ClubBuilderSection = {
  id: string;
  title: string;
  enabled: boolean;
  background: "none" | "card" | "dark" | "fire";
  width: "contained" | "full";
  layout: "vertical" | "horizontal";
  blocks: ClubBuilderBlock[];
};
export type ClubBuilderSectionOptions = Omit<ClubBuilderSection, "id" | "title" | "enabled">;
export type ClubBuilderLayout = {
  order: string[];
  hiddenSectionIds: string[];
  customSections: ClubBuilderSection[];
  sectionOptions: Record<string, ClubBuilderSectionOptions>;
};

const BUILDER_BLOCK_TYPES: ClubBuilderBlockType[] = [
  "heading",
  "subtitle",
  "paragraph",
  "image",
  "video",
  "price",
  "button",
  "subsection",
];

function isSafeBuilderUrl(value: string) {
  return (
    !value || (value.startsWith("/") && !value.startsWith("//")) || /^https?:\/\//i.test(value)
  );
}

export function validateClubBuilderLayout(value: string): ClubBuilderLayout {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("La estructura de secciones tiene un formato inválido");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("La estructura de secciones no es válida");
  }

  const layout = parsed as Partial<ClubBuilderLayout>;
  if (
    !Array.isArray(layout.customSections) ||
    layout.customSections.length > 30 ||
    !Array.isArray(layout.order) ||
    !Array.isArray(layout.hiddenSectionIds) ||
    !layout.sectionOptions ||
    typeof layout.sectionOptions !== "object" ||
    Array.isArray(layout.sectionOptions)
  ) {
    throw new Error("La estructura de secciones no es válida o supera el límite permitido");
  }

  const ids = new Set<string>(CLUB_BUILDER_SECTIONS.map((section) => section.id));
  for (const section of layout.customSections) {
    if (
      !section ||
      typeof section !== "object" ||
      typeof section.id !== "string" ||
      !/^custom-[\w-]{1,70}$/.test(section.id) ||
      ids.has(section.id) ||
      typeof section.title !== "string" ||
      section.title.length > 120 ||
      typeof section.enabled !== "boolean" ||
      !["none", "card", "dark", "fire"].includes(section.background) ||
      !["contained", "full"].includes(section.width) ||
      !["vertical", "horizontal"].includes(section.layout) ||
      !Array.isArray(section.blocks) ||
      section.blocks.length > 40
    ) {
      throw new Error("Una sección personalizada tiene datos inválidos");
    }
    ids.add(section.id);

    const blockIds = new Set<string>();
    const validateBlock = (block: ClubBuilderBlock, nested: boolean) => {
      if (
        !block ||
        typeof block !== "object" ||
        typeof block.id !== "string" ||
        !/^[\w-]{1,80}$/.test(block.id) ||
        blockIds.has(block.id) ||
        !BUILDER_BLOCK_TYPES.includes(block.type) ||
        (nested && block.type === "subsection") ||
        typeof block.title !== "string" ||
        block.title.length > 500 ||
        typeof block.text !== "string" ||
        block.text.length > 5_000 ||
        typeof block.url !== "string" ||
        block.url.length > 2_000 ||
        !isSafeBuilderUrl(block.url) ||
        !["vertical", "horizontal"].includes(block.layout) ||
        !Array.isArray(block.children) ||
        block.children.length > 20 ||
        (block.type !== "subsection" && block.children.length > 0)
      ) {
        throw new Error("Un elemento de sección tiene datos inválidos");
      }
      blockIds.add(block.id);
      block.children.forEach((child) => validateBlock(child, true));
    };
    section.blocks.forEach((block) => validateBlock(block, false));
  }

  if (
    layout.order.length !== ids.size ||
    layout.order.some((id) => typeof id !== "string" || !ids.has(id)) ||
    new Set(layout.order).size !== layout.order.length ||
    layout.hiddenSectionIds.some(
      (id) => typeof id !== "string" || !CLUB_BUILDER_SECTIONS.some((section) => section.id === id),
    )
  ) {
    throw new Error("El orden o la visibilidad de las secciones no es válida");
  }

  const optionsIds = Object.keys(layout.sectionOptions);
  if (
    optionsIds.some((id) => !CLUB_BUILDER_SECTIONS.some((section) => section.id === id)) ||
    optionsIds.length !== CLUB_BUILDER_SECTIONS.length
  ) {
    throw new Error("La configuración de secciones existentes no es válida");
  }
  for (const options of Object.values(layout.sectionOptions)) {
    if (
      !options ||
      typeof options !== "object" ||
      !["none", "card", "dark", "fire"].includes(options.background) ||
      !["contained", "full"].includes(options.width) ||
      !["vertical", "horizontal"].includes(options.layout) ||
      !Array.isArray(options.blocks) ||
      options.blocks.length > 40
    ) {
      throw new Error("La configuración visual de una sección no es válida");
    }
    const blockIds = new Set<string>();
    const validateOptionBlock = (block: ClubBuilderBlock, nested: boolean) => {
      if (
        !block ||
        typeof block !== "object" ||
        typeof block.id !== "string" ||
        !/^[\w-]{1,80}$/.test(block.id) ||
        blockIds.has(block.id) ||
        !BUILDER_BLOCK_TYPES.includes(block.type) ||
        (nested && block.type === "subsection") ||
        typeof block.title !== "string" ||
        block.title.length > 500 ||
        typeof block.text !== "string" ||
        block.text.length > 5_000 ||
        typeof block.url !== "string" ||
        block.url.length > 2_000 ||
        !isSafeBuilderUrl(block.url) ||
        !["vertical", "horizontal"].includes(block.layout) ||
        !Array.isArray(block.children) ||
        block.children.length > 20 ||
        (block.type !== "subsection" && block.children.length > 0)
      ) {
        throw new Error("Un elemento de sección existente tiene datos inválidos");
      }
      blockIds.add(block.id);
      block.children.forEach((child) => validateOptionBlock(child, true));
    };
    options.blocks.forEach((block) => validateOptionBlock(block, false));
  }

  return layout as ClubBuilderLayout;
}

const DEFAULT_SECTION_OPTIONS: ClubBuilderSectionOptions = {
  background: "none",
  width: "contained",
  layout: "vertical",
  blocks: [],
};

function isBuilderBackground(value: unknown): value is ClubBuilderSection["background"] {
  return value === "none" || value === "card" || value === "dark" || value === "fire";
}

function isBuilderWidth(value: unknown): value is ClubBuilderSection["width"] {
  return value === "contained" || value === "full";
}

export const DEFAULT_CLUB_BUILDER_LAYOUT: ClubBuilderLayout = {
  order: CLUB_BUILDER_SECTIONS.map((section) => section.id),
  hiddenSectionIds: [],
  customSections: [],
  sectionOptions: Object.fromEntries(
    CLUB_BUILDER_SECTIONS.map((section) => [
      section.id,
      { ...DEFAULT_SECTION_OPTIONS, blocks: [] },
    ]),
  ),
};

const collectionDefaults = {
  club_course_cards: [
    {
      id: "club-course-maestro-churrasquero",
      title: "Maestro Churrasquero",
      subtitle: "De cero al fuego perfecto",
      tag: "Curso insignia",
      description:
        "Si cada asado te sale distinto y estás cansado de depender de la suerte, este curso es para vos. De los fundamentos del fuego al punto perfecto de cada corte.",
      bullets:
        "Fundamentos del calor, brasas y manejo por zonas\nEl punto exacto de cada corte\nSellado, reposo y timing\nDe los cortes finos a las piezas grandes",
      image: "/courses/curso-fuego.jpg",
    },
    {
      id: "club-course-amos-del-humo",
      title: "Amos del Humo",
      subtitle: "Ahumados y BBQ estilo USA",
      tag: "BBQ & ahumados",
      description:
        "¿Viste esos ahumados que se deshacen solos y pensaste que eran imposibles en casa? No lo son. Dominá el BBQ norteamericano con control real de humo.",
      bullets:
        "Tipos de ahumadores y maderas\nControl de tiempo y temperatura: bajo y lento\nBrisket, costillas, short ribs y pulled pork\nRubs, salsas y el anillo de humo",
      image: "/courses/curso-bbq.jpg",
    },
    {
      id: "club-course-fuego-ancestral",
      title: "Fuego Ancestral",
      subtitle: "Asado a la leña, a la cruz y al baral",
      tag: "Curso en línea",
      description:
        "Cocinar con fuego vivo es la técnica más ancestral y la más emocionante. Asá piezas completas a la cruz y al baral, como en las grandes celebraciones del sur.",
      bullets:
        "Elección y manejo de la leña\nEncendido y administración del fuego\nCostillares y piezas enteras a la cruz\nCómo adaptarte al clima y al viento",
      image: "/courses/curso-lena.jpg",
    },
    {
      id: "club-course-caja-china",
      title: "Maestría en Caja China",
      subtitle: "El secreto del cerdo crocante",
      tag: "Curso en línea",
      description:
        "La forma más segura de sacar un cerdo entero crocante por fuera y jugoso por dentro. Aprendé los cortes, tiempos y temperaturas para nunca más arruinar una pieza grande.",
      bullets:
        "Armado y manejo de la caja china\nCortes recomendados y su preparación\nTiempos y temperaturas según el peso\nEl punto crocante de la piel",
      image: "",
    },
    {
      id: "club-course-dry-age",
      title: "Dry Age en Casa",
      subtitle: "Maduración en seco, hecha por vos",
      tag: "Técnica premium",
      description:
        "La maduración en seco transforma tus cortes en otro nivel de suavidad y sabor. Aprendé a hacerlo de forma segura y precisa en casa. Sabor de restaurante, sin el precio.",
      bullets:
        "La ciencia de la maduración, simple\nCómo hacerlo seguro en casa\nTiempos y qué cortes sirven\nCómo evaluar el punto y cortar",
      image: "",
    },
    {
      id: "club-course-conoce-la-res",
      title: "Conocé la Res",
      subtitle: "Cortes y desposte completo",
      tag: "Clase maestra",
      description:
        "Dejá de comprar a ciegas. Conocé la res entera, corte por corte, con clases de desposte: qué es cada pieza, para qué sirve y cómo elegir la mejor calidad.",
      bullets:
        "Anatomía completa de la res con desposte\nNombre y ubicación de cada corte\nQué técnica le va mejor a cada uno\nCómo reconocer y elegir calidad",
      image: "/courses/curso-cortes.jpg",
    },
  ],
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
  video_url: "",
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
  club_builder: JSON.stringify(DEFAULT_CLUB_BUILDER_LAYOUT),
  courses_page_builder: "[]",
  ...CATERING_PAGE_DEFAULTS,
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
    description: "Imagen de portada, video, títulos y duración de la presentación.",
    fields: [
      { key: "video_eyebrow", label: "Texto pequeño", type: "text" },
      { key: "video_title", label: "Título de la sección", type: "text" },
      { key: "video_image", label: "Imagen de presentación", type: "image" },
      { key: "video_image_alt", label: "Descripción accesible de la imagen", type: "text" },
      {
        key: "video_url",
        label: "Video de presentación",
        type: "video",
        help: "Sube un video MP4, WebM u OGG de hasta 100 MB, o pega una URL HTTPS.",
      },
      { key: "video_badge", label: "Etiqueta sobre la imagen", type: "text" },
      { key: "video_overlay_title", label: "Título sobre la imagen", type: "text" },
      { key: "video_duration", label: "Duración mostrada", type: "text" },
    ],
  },
  {
    id: "courses",
    title: "Cursos",
    description:
      "Estas tarjetas son una copia independiente para la página del Club. Editarlas aquí no modifica el catálogo de /cursos.",
    fields: [
      { key: "courses_eyebrow", label: "Texto pequeño", type: "text" },
      { key: "courses_title", label: "Título de la sección", type: "text" },
      { key: "courses_description", label: "Descripción", type: "textarea" },
      { key: "courses_cta", label: "Texto del botón de suscripción en cada curso", type: "text" },
    ],
    collections: [
      {
        key: "club_course_cards",
        label: "Cursos que se muestran en el Club",
        help: "Administra por separado las tarjetas que aparecen en esta página: textos, imagen, etiqueta y lista de temas.",
        fields: [
          { key: "title", label: "Título" },
          { key: "subtitle", label: "Subtítulo" },
          { key: "tag", label: "Etiqueta" },
          { key: "description", label: "Descripción", multiline: true },
          { key: "bullets", label: "Temas (uno por línea)", multiline: true },
          { key: "image", label: "Imagen", image: true },
        ],
      },
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
    description:
      "Información comercial y lista de beneficios. Los planes y precios se editan en Solicitudes del Club.",
    fields: [
      { key: "membership_eyebrow", label: "Texto pequeño", type: "text" },
      { key: "membership_title", label: "Título", type: "text" },
      {
        key: "membership_course_intro",
        label: "Texto sobre el valor de los cursos",
        type: "textarea",
      },
      { key: "membership_price_caption", label: "Texto del precio", type: "text" },
      { key: "membership_regular_price", label: "Precio anual regular (Bs)", type: "number" },
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

export function getClubBuilderLayout(value: string | undefined): ClubBuilderLayout {
  try {
    const parsed: unknown = JSON.parse(value ?? "");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return DEFAULT_CLUB_BUILDER_LAYOUT;
    }
    const layout = parsed as Partial<ClubBuilderLayout>;
    const normalizeBlocks = (blocks: ClubBuilderBlock[]): ClubBuilderBlock[] =>
      blocks.map((block) => ({
        ...block,
        layout: block.layout === "horizontal" ? "horizontal" : "vertical",
        children: Array.isArray(block.children) ? normalizeBlocks(block.children) : [],
      }));
    const customSections = Array.isArray(layout.customSections)
      ? layout.customSections
          .filter(
            (section): section is ClubBuilderSection =>
              !!section &&
              typeof section === "object" &&
              typeof section.id === "string" &&
              typeof section.title === "string" &&
              Array.isArray(section.blocks),
          )
          .map((section): ClubBuilderSection => ({
            ...section,
            enabled: section.enabled !== false,
            background: isBuilderBackground(section.background) ? section.background : "card",
            width: isBuilderWidth(section.width) ? section.width : "contained",
            layout: section.layout === "horizontal" ? "horizontal" : "vertical",
            blocks: normalizeBlocks(section.blocks),
          }))
      : [];
    const sectionOptions: Record<string, ClubBuilderSectionOptions> = Object.fromEntries(
      CLUB_BUILDER_SECTIONS.map((section) => {
        const options = layout.sectionOptions?.[section.id];
        if (
          !options ||
          !["none", "card", "dark", "fire"].includes(options.background) ||
          !["contained", "full"].includes(options.width) ||
          !["vertical", "horizontal"].includes(options.layout) ||
          !Array.isArray(options.blocks)
        ) {
          return [section.id, { ...DEFAULT_SECTION_OPTIONS, blocks: [] }];
        }
        return [section.id, { ...options, blocks: normalizeBlocks(options.blocks) }];
      }),
    );
    const customIds = customSections.map((section) => section.id);
    const availableIds = new Set([
      ...CLUB_BUILDER_SECTIONS.map((section) => section.id),
      ...customIds,
    ]);
    const requestedOrder = Array.isArray(layout.order)
      ? layout.order.filter((id): id is string => typeof id === "string" && availableIds.has(id))
      : [];
    const order = [
      ...requestedOrder,
      ...[...availableIds].filter((id) => !requestedOrder.includes(id)),
    ];
    return {
      order,
      hiddenSectionIds: Array.isArray(layout.hiddenSectionIds)
        ? layout.hiddenSectionIds.filter((id): id is string => typeof id === "string")
        : [],
      customSections,
      sectionOptions,
    };
  } catch {
    return DEFAULT_CLUB_BUILDER_LAYOUT;
  }
}
