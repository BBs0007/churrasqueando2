// Reglas del Club Churrasqueando (editables)
export const CLUB = {
  name: "Club Churrasqueando",
  // Puntos Brasa se ganan al completar videos y cursos; canjeables en pedidos.
  pointsPerCompletedLesson: 10,
  pointsPerCompletedCourse: 50,
  redeemStep: 100,
  redeemValueBs: 10,
  // Suscripción (solo plan anual)
  annualPriceBs: 699,
  planLabel: "Anual",
  singleCoursePriceBs: 250,
  coursesCount: 6,
  // Cupos de Socio Fundador
  founders: {
    total: 30,
    remaining: 12,
  },
};

export const CLUB_WHATSAPP = "59169190624";

// Los cursos quedan visibles para socios del Club a partir de esta fecha.
// Antes de esa fecha, solo el equipo admin puede ver/editar el contenido.
export const COURSES_LAUNCH_AT = "2026-09-29T00:00:00-04:00";

// Oferta de lanzamiento para socios fundadores: 450 Bs anual
export const CLUB_LAUNCH_OFFER = {
  annualPriceBs: 450,
  realAnnualPriceBs: 699,
};

export const CLUB_BENEFITS = [
  {
    id: "fundador",
    icon: "lock",
    title: "Precio de fundador",
    badge: null,
    description:
      "Los primeros socios entran con precio congelado de por vida. No vuelve a subir nunca — y si cancelás, lo perdés.",
  },
  {
    id: "merch",
    icon: "shirt",
    title: "Merch exclusivo",
    badge: "Nuevo",
    description:
      "Kit físico de marca (mandil y más) que solo tienen los socios fundadores. Estatus e identidad de la tribu.",
  },
  {
    id: "puntos-brasa",
    icon: "hand",
    title: "Puntos Brasa",
    badge: "Cambia",
    description:
      "Sumás puntos al completar videos y cursos, y los canjeás por descuentos en productos, combos y la tienda del Club.",
  },
  {
    id: "grabaciones",
    icon: "video",
    title: "Grabaciones en vivo",
    badge: "Nuevo",
    description:
      "Estás en el rodaje de los cursos, preguntás en tiempo real y sos parte de cómo se hace cada clase.",
  },
];

export const PUNTOS_BRASA_STEPS = [
  {
    id: "1",
    title: "Aprendés con cada video",
    description: `Cada video completado suma ${CLUB.pointsPerCompletedLesson} Puntos de Brasa.`,
  },
  {
    id: "2",
    title: "Completás un curso",
    description: `Al terminar todos sus videos, recibís ${CLUB.pointsPerCompletedCourse} Puntos de Brasa extra.`,
  },
  {
    id: "3",
    title: "Canjeás descuentos",
    description: `Cada ${CLUB.redeemStep} Puntos de Brasa equivalen a Bs ${CLUB.redeemValueBs} de descuento en la tienda.`,
  },
];

export const FOUNDER_PERKS = [
  {
    id: "precio",
    icon: "lock",
    label: "Precio congelado de por vida",
    strong: "congelado de por vida",
  },
  { id: "merch", icon: "award", label: "Merch exclusivo de fundador", strong: "exclusivo" },
  { id: "numero", icon: "star", label: "Número de socio fundador", strong: "Número de socio" },
  {
    id: "grabaciones",
    icon: "video",
    label: "Acceso a grabaciones en vivo",
    strong: "grabaciones en vivo",
  },
];

export const CLUB_TESTIMONIALS = [
  {
    id: "marcelo",
    quote:
      "Antes cada asado me salía distinto. Con el curso del fuego dejé de improvisar. Ahora en casa me piden que cocine yo.",
    name: "Marcelo A.",
    role: "Socio desde el mes 1",
  },
  {
    id: "rodrigo",
    quote:
      "El brisket me salía seco siempre. Seguí el paso a paso de Amos del Humo y me salió como de competencia. Impresionante.",
    name: "Rodrigo V.",
    role: "Socio Fundador",
  },
  {
    id: "daniela",
    quote:
      "Los Puntos Brasa son lo mejor: cada curso que termino me acerca a descuentos para mi próximo asado.",
    name: "Daniela P.",
    role: "Socia desde el mes 2",
  },
];

export const CLUB_FAQS = [
  {
    id: "pago",
    question: "¿Cómo pago la membresía?",
    answer:
      "Por QR o transferencia, con la membresía anual. Te enviamos el acceso apenas confirmamos el pago.",
  },
  {
    id: "cancelar",
    question: "¿Puedo cancelar cuando quiera?",
    answer:
      "Sí, sin permanencia. Ojo: si cancelás, perdés el precio congelado de fundador y no vuelve.",
  },
  {
    id: "disponibilidad",
    question: "¿Los cursos ya están disponibles?",
    answer:
      "Se liberan de forma progresiva. Como Socio Fundador entrás con acceso anticipado y precio bloqueado mientras se suben.",
  },
  {
    id: "puntos",
    question: "¿Cómo uso los Puntos Brasa?",
    answer: `Ganás Puntos de Brasa al completar videos y cursos. Cada ${CLUB.redeemStep} puntos equivalen a Bs ${CLUB.redeemValueBs} de descuento en productos, combos y la tienda del Club.`,
  },
];
